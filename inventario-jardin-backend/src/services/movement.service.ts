// =============================================================================
// src/services/movement.service.ts
// Movimientos de inventario con cálculo de stock atómico y alertas automáticas.
// TODAS las modificaciones de stock ocurren en transacciones — nunca stock negativo.
// =============================================================================

import { Prisma } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parsePaginationQuery, buildPaginationMeta } from '../utils/response';
import type { CreateMovementInput, MovementQuery, ReportQuery } from '../validators/movement.validator';

// ── Selector estándar ─────────────────────────────────────────────────────────

const movementSelect = {
  id: true, movementType: true, status: true,
  quantity: true, quantityBefore: true, quantityAfter: true,
  unitCost: true, totalCost: true, referenceNumber: true,
  reason: true, notes: true, movementDate: true,
  createdAt: true,
  item: {
    select: {
      id: true, name: true, code: true, unit: true,
      section: { select: { id: true, name: true, color: true } },
      fieldValues: {
        select: {
          valueText: true, valueNumber: true,
          valueDate: true, valueBoolean: true,
          field: { select: { label: true, fieldType: true, slug: true, displayOrder: true } },
        },
        orderBy: { field: { displayOrder: 'asc' } },
      },
    },
  },
  destinationItem: {
    select: { id: true, name: true, code: true, unit: true },
  },
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
  confirmedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.InventoryMovementSelect;

// ── Alerta automática de stock bajo ──────────────────────────────────────────

async function checkAndCreateAlert(
  tx: Prisma.TransactionClient,
  itemId: string,
  currentQty: number,
  minimumQty: number
): Promise<void> {
  if (currentQty <= minimumQty) {
    // Solo crear alerta si no existe una activa
    const existingAlert = await tx.stockAlert.findFirst({
      where: { itemId, isResolved: false },
    });
    if (!existingAlert) {
      await tx.stockAlert.create({
        data: {
          itemId,
          quantityAtAlert: new Prisma.Decimal(currentQty),
          minimumQuantity: new Prisma.Decimal(minimumQty),
        },
      });
    }
  } else {
    // Resolver alertas previas si el stock volvió al nivel normal
    await tx.stockAlert.updateMany({
      where: { itemId, isResolved: false },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }
}

// ── MovementService ───────────────────────────────────────────────────────────

export const MovementService = {

  async findAll(query: MovementQuery) {
    const { page, limit, skip, sortOrder } = parsePaginationQuery({
      ...query,
      sortOrder: query.sortOrder,
    });

    const allowedSectionIds = (query as Record<string, unknown>).allowedSectionIds as string[] | undefined;

    const where: Prisma.InventoryMovementWhereInput = {
      ...(query.itemId       && { itemId: query.itemId }),
      ...(query.movementType && { movementType: query.movementType as Prisma.EnumMovementTypeFilter }),
      ...(query.status       && { status: query.status as Prisma.EnumMovementStatusFilter }),
      ...(query.supplierId   && { supplierId: query.supplierId }),
      ...((query.dateFrom || query.dateTo) && {
        movementDate: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo   && { lte: new Date(query.dateTo) }),
        },
      }),
      // Filtrar por sección via item — sección específica o lista de permitidas
      ...(query.sectionId
        ? { item: { sectionId: query.sectionId } }
        : allowedSectionIds
          ? { item: { sectionId: { in: allowedSectionIds } } }
          : {}
      ),
    };

    const [movements, total] = await Promise.all([
      db.inventoryMovement.findMany({
        where,
        select: movementSelect,
        orderBy: { movementDate: sortOrder },
        skip,
        take: limit,
      }),
      db.inventoryMovement.count({ where }),
    ]);

    return { data: movements, meta: buildPaginationMeta(total, page, limit) };
  },

  async findById(id: string) {
    const movement = await db.inventoryMovement.findUnique({
      where: { id },
      select: movementSelect,
    });
    if (!movement) throw new AppError('Movimiento no encontrado', 404);
    return movement;
  },

  async create(input: CreateMovementInput, createdById: string) {
    // Obtener el ítem con lock (SELECT FOR UPDATE via transacción)
    return db.$transaction(async (tx: Prisma.TransactionClient) => {

      // Bloquear el registro del ítem para evitar race conditions
      const item = await tx.inventoryItem.findFirst({
        where: { id: input.itemId, deletedAt: null, isActive: true },
      });
      if (!item) throw new AppError('Producto no encontrado o inactivo', 404);

      const currentQty = Number(item.quantityCurrent);
      const qty = Number(input.quantity);
      let newQty: number;

      // ── Calcular nuevo stock según tipo de movimiento ────────────────────────
      switch (input.movementType) {
        case 'ENTRY':
          newQty = currentQty + qty;
          break;

        case 'EXIT':
          if (currentQty < qty) {
            throw new AppError(
              `Stock insuficiente. Disponible: ${currentQty} ${item.unit}, solicitado: ${qty} ${item.unit}`,
              409
            );
          }
          newQty = currentQty - qty;
          break;

        case 'TRANSFER': {
          if (!input.destinationItemId) {
            throw new AppError('TRANSFER requiere destinationItemId', 422);
          }
          const dest = await tx.inventoryItem.findFirst({
            where: { id: input.destinationItemId, deletedAt: null, isActive: true },
          });
          if (!dest) throw new AppError('Producto destino no encontrado o inactivo', 404);

          if (currentQty < qty) {
            throw new AppError(
              `Stock insuficiente para transferir. Disponible: ${currentQty} ${item.unit}`,
              409
            );
          }
          newQty = currentQty - qty;

          // Actualizar destino
          const destNewQty = Number(dest.quantityCurrent) + qty;
          await tx.inventoryItem.update({
            where: { id: input.destinationItemId },
            data: { quantityCurrent: new Prisma.Decimal(destNewQty) },
          });

          // Crear movimiento de entrada para el destino
          await tx.inventoryMovement.create({
            data: {
              itemId:         input.destinationItemId,
              movementType:   'ENTRY',
              status:         'CONFIRMED',
              quantity:       new Prisma.Decimal(qty),
              quantityBefore: new Prisma.Decimal(Number(dest.quantityCurrent)),
              quantityAfter:  new Prisma.Decimal(destNewQty),
              reason:         `Transferencia desde producto: ${item.name}`,
              notes:          input.notes,
              createdById,
            },
          });

          await checkAndCreateAlert(
            tx, input.destinationItemId,
            destNewQty, Number(dest.quantityMinimum)
          );
          break;
        }

        case 'ADJUSTMENT':
          // Ajuste: la quantity es el nuevo valor absoluto de stock
          newQty = qty;
          break;

        default:
          throw new AppError('Tipo de movimiento inválido', 422);
      }

      // Actualizar stock del ítem origen
      await tx.inventoryItem.update({
        where: { id: input.itemId },
        data: { quantityCurrent: new Prisma.Decimal(newQty) },
      });

      // Crear el movimiento principal
      const movement = await tx.inventoryMovement.create({
        data: {
          itemId:           input.itemId,
          movementType:     input.movementType,
          status:           'CONFIRMED',
          quantity:         new Prisma.Decimal(qty),
          quantityBefore:   new Prisma.Decimal(currentQty),
          quantityAfter:    new Prisma.Decimal(newQty),
          unitCost:         input.unitCost != null ? new Prisma.Decimal(input.unitCost) : null,
          totalCost:        input.unitCost != null
            ? new Prisma.Decimal(input.unitCost * qty)
            : null,
          supplierId:       input.supplierId,
          destinationItemId: input.destinationItemId,
          referenceNumber:  input.referenceNumber,
          reason:           input.reason,
          notes:            input.notes,
          movementDate:     input.movementDate ? new Date(input.movementDate) : new Date(),
          createdById,
        },
        select: movementSelect,
      });

      // Crear o resolver alerta automática
      await checkAndCreateAlert(tx, input.itemId, newQty, Number(item.quantityMinimum));

      return movement;
    }, {
      // Timeout de 15 segundos — movimientos no deberían tardar más
      timeout: 15000,
      // Nivel de aislamiento que previene dirty reads y non-repeatable reads
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  },

  async getReport(query: ReportQuery) {
    const allowedSectionIds = (query as Record<string, unknown>).allowedSectionIds as string[] | undefined;

    const where: Prisma.InventoryMovementWhereInput = {
      movementDate: {
        gte: new Date(query.dateFrom),
        lte: new Date(query.dateTo),
      },
      ...(query.sectionId
        ? { item: { sectionId: query.sectionId } }
        : allowedSectionIds
          ? { item: { sectionId: { in: allowedSectionIds } } }
          : {}
      ),
      ...(query.movementType && { movementType: query.movementType as Prisma.EnumMovementTypeFilter }),
    };

    const movements = await db.inventoryMovement.findMany({
      where,
      select: movementSelect,
      orderBy: { movementDate: 'desc' },
    });

    // Resumen por tipo
    const summary = movements.reduce<Record<string, { count: number; totalQuantity: number; totalCost: number }>>(
      (acc: Record<string, { count: number; totalQuantity: number; totalCost: number }>, m) => {
        const key = m.movementType;
        if (!acc[key]) acc[key] = { count: 0, totalQuantity: 0, totalCost: 0 };
        acc[key].count += 1;
        acc[key].totalQuantity += Number(m.quantity);
        acc[key].totalCost += Number(m.totalCost ?? 0);
        return acc;
      },
      {}
    );

    // Recolectar IDs únicos de secciones para obtener sus campos personalizados
    const sectionIds = [...new Set(movements.map((m: { item: { section: { id: string } } }) => m.item.section.id))];
    const sections   = await db.section.findMany({
      where: { id: { in: sectionIds } },
      select: {
        id: true, name: true, color: true, icon: true,
        customFields: {
          where:   { deletedAt: null },
          select:  { id: true, label: true, fieldType: true, slug: true, displayOrder: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return {
      movements,
      summary,
      sections,   // metadatos de secciones + sus campos personalizados
      period: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      total:  movements.length,
    };
  },

  async getItemHistory(itemId: string) {
    const item = await db.inventoryItem.findFirst({
      where: { id: itemId, deletedAt: null },
      select: {
        id: true, name: true, code: true, unit: true,
        quantityCurrent: true, quantityMinimum: true,
        section: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new AppError('Producto no encontrado', 404);

    const movements = await db.inventoryMovement.findMany({
      where: { itemId },
      select: movementSelect,
      orderBy: { movementDate: 'desc' },
      take: 100, // máximo historial reciente
    });

    return { item, movements };
  },
};
