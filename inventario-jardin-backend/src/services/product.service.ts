// =============================================================================
// src/services/product.service.ts
// Productos con campos dinámicos por sección + lógica de stock
// =============================================================================

import { Prisma, FieldType } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parsePaginationQuery, buildPaginationMeta } from '../utils/response';
import { InventoryFilters } from '../types';
import type { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

// ── Selector reutilizable ─────────────────────────────────────────────────────

const productSelect = {
  id: true, code: true, name: true, description: true,
  unit: true, location: true, notes: true, isActive: true,
  quantityMinimum: true, quantityMaximum: true, quantityCurrent: true,
  createdAt: true, updatedAt: true,
  section: { select: { id: true, name: true, slug: true, color: true, icon: true } },
  createdBy: { select: { id: true, fullName: true } },
  fieldValues: {
    select: {
      fieldId: true,
      valueText: true, valueNumber: true, valueDate: true,
      valueBoolean: true, valueOptionId: true,
      field: {
        select: {
          id: true, name: true, slug: true, label: true, fieldType: true,
          dropdownOptions: {
            where: { isActive: true },
            select: { id: true, label: true, value: true, color: true },
          },
        },
      },
    },
  },
  stockAlerts: {
    where: { isResolved: false },
    select: { id: true, quantityAtAlert: true, minimumQuantity: true, createdAt: true },
    take: 1,
  },
} satisfies Prisma.InventoryItemSelect;

// ── Upsert de valores de campos dinámicos (dentro de tx) ──────────────────────

async function upsertFieldValues(
  tx: Prisma.TransactionClient,
  itemId: string,
  fieldValues: Array<{ fieldId: string; value?: string | number | boolean | null }>
): Promise<void> {
  for (const fv of fieldValues) {
    const field = await tx.customField.findFirst({
      where: { id: fv.fieldId, deletedAt: null },
    });
    if (!field) continue; // Ignorar campos inexistentes

    // Mapear valor al tipo correcto según el campo
    const valueData: Prisma.ItemFieldValueUncheckedCreateInput = {
      itemId,
      fieldId: fv.fieldId,
      valueText:     null,
      valueNumber:   null,
      valueDate:     null,
      valueBoolean:  null,
      valueOptionId: null,
    };

    const v = fv.value;
    switch (field.fieldType as FieldType) {
      case 'TEXT':
        valueData.valueText = v != null ? String(v) : null;
        break;
      case 'NUMBER':
        valueData.valueNumber = v != null ? new Prisma.Decimal(Number(v)) : null;
        break;
      case 'DATE':
        valueData.valueDate = v && typeof v === 'string' ? new Date(v) : null;
        break;
      case 'BOOLEAN':
        valueData.valueBoolean = v != null ? Boolean(v) : null;
        break;
      case 'DROPDOWN':
        valueData.valueOptionId = v != null ? String(v) : null;
        break;
    }

    await tx.itemFieldValue.upsert({
      where:  { itemId_fieldId: { itemId, fieldId: fv.fieldId } },
      create: valueData,
      update: {
        valueText:     valueData.valueText,
        valueNumber:   valueData.valueNumber,
        valueDate:     valueData.valueDate,
        valueBoolean:  valueData.valueBoolean,
        valueOptionId: valueData.valueOptionId,
      },
    });
  }
}

// ── ProductService ────────────────────────────────────────────────────────────

export const ProductService = {

  async findAll(filters: InventoryFilters) {
    const { page, limit, skip, sortOrder } = parsePaginationQuery(filters);

    const isActive = filters.isActive !== undefined
      ? filters.isActive === 'true' || filters.isActive === true
      : undefined;

    const allowedSectionIds = (filters as Record<string, unknown>).allowedSectionIds as string[] | undefined;

    const where: Prisma.InventoryItemWhereInput = {
      deletedAt: null,
      ...(filters.sectionId && { sectionId: filters.sectionId }),
      ...(!filters.sectionId && allowedSectionIds && { sectionId: { in: allowedSectionIds } }),
      ...(isActive !== undefined && { isActive }),
      ...(filters.unit && { unit: filters.unit }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    // Filtro de stock bajo (current <= minimum)
    const isLowStock = filters.lowStock === 'true' || filters.lowStock === true;

    const sortBy = (filters.sortBy as string) || 'name';
    const allowedSorts: Record<string, Prisma.InventoryItemOrderByWithRelationInput> = {
      name:            { name: sortOrder },
      code:            { code: sortOrder },
      quantityCurrent: { quantityCurrent: sortOrder },
      createdAt:       { createdAt: sortOrder },
      updatedAt:       { updatedAt: sortOrder },
    };
    const orderBy = allowedSorts[sortBy] || { name: 'asc' as const };

    const [rawItems, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        select: productSelect,
        orderBy,
        skip,
        take: limit,
      }),
      db.inventoryItem.count({ where }),
    ]);

    // Aplicar filtro de lowStock en memoria (Prisma no soporta comparación entre columnas directamente)
    const items = isLowStock
      ? rawItems.filter(i =>
          Number(i.quantityCurrent) <= Number(i.quantityMinimum)
        )
      : rawItems;

    return { data: items, meta: buildPaginationMeta(total, page, limit) };
  },

  async findById(id: string) {
    const item = await db.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      select: productSelect,
    });
    if (!item) throw new AppError('Producto no encontrado', 404);
    return item;
  },

  async create(input: CreateProductInput, createdById: string) {
    // Validar que la sección exista
    const section = await db.section.findFirst({
      where: { id: input.sectionId, deletedAt: null, isActive: true },
      include: { customFields: { where: { deletedAt: null, isRequired: true } } },
    });
    if (!section) throw new AppError('Sección no encontrada o inactiva', 404);

    // Validar campos requeridos de la sección
    const requiredFieldIds = section.customFields.map(f => f.id);
    const providedFieldIds = (input.fieldValues || []).map(fv => fv.fieldId);
    const missingRequired = requiredFieldIds.filter(id => !providedFieldIds.includes(id));
    if (missingRequired.length > 0) {
      const missingNames = section.customFields
        .filter(f => missingRequired.includes(f.id))
        .map(f => f.label)
        .join(', ');
      throw new AppError(`Campos requeridos faltantes: ${missingNames}`, 422);
    }

    // Verificar código único si se proporcionó
    if (input.code) {
      const codeExists = await db.inventoryItem.findFirst({
        where: { code: input.code, deletedAt: null },
      });
      if (codeExists) throw new AppError(`El código "${input.code}" ya está en uso`, 409);
    }

    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          sectionId:       input.sectionId,
          name:            input.name,
          code:            input.code,
          description:     input.description,
          unit:            input.unit ?? 'unidad',
          location:        input.location,
          notes:           input.notes,
          quantityMinimum: input.quantityMinimum ?? 0,
          quantityMaximum: input.quantityMaximum ?? null,
          quantityCurrent: input.quantityInitial ?? 0,
          createdById,
        },
      });

      // Guardar valores de campos dinámicos
      if (input.fieldValues?.length) {
        await upsertFieldValues(tx, item.id, input.fieldValues);
      }

      // Si tiene stock inicial, crear movimiento de entrada
      if ((input.quantityInitial ?? 0) > 0) {
        await tx.inventoryMovement.create({
          data: {
            itemId:         item.id,
            movementType:   'ENTRY',
            status:         'CONFIRMED',
            quantity:       new Prisma.Decimal(input.quantityInitial!),
            quantityBefore: new Prisma.Decimal(0),
            quantityAfter:  new Prisma.Decimal(input.quantityInitial!),
            reason:         'Stock inicial al crear producto',
            createdById,
          },
        });
      }

      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: item.id },
        select: productSelect,
      });
    });
  },

  async update(id: string, input: UpdateProductInput, userId: string) {
    const existing = await db.inventoryItem.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new AppError('Producto no encontrado', 404);

    // Verificar código único si cambió
    if (input.code && input.code !== existing.code) {
      const codeExists = await db.inventoryItem.findFirst({
        where: { code: input.code, deletedAt: null, id: { not: id } },
      });
      if (codeExists) throw new AppError(`El código "${input.code}" ya está en uso`, 409);
    }

    void userId;
    return db.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id },
        data: {
          ...(input.name            !== undefined && { name: input.name }),
          ...(input.code            !== undefined && { code: input.code }),
          ...(input.description     !== undefined && { description: input.description }),
          ...(input.unit            !== undefined && { unit: input.unit }),
          ...(input.location        !== undefined && { location: input.location }),
          ...(input.notes           !== undefined && { notes: input.notes }),
          ...(input.quantityMinimum !== undefined && { quantityMinimum: input.quantityMinimum }),
          ...(input.quantityMaximum !== undefined && { quantityMaximum: input.quantityMaximum }),
          ...(input.isActive        !== undefined && { isActive: input.isActive }),
        },
      });

      if (input.fieldValues?.length) {
        await upsertFieldValues(tx, id, input.fieldValues);
      }

      return tx.inventoryItem.findUniqueOrThrow({ where: { id }, select: productSelect });
    });
  },

  async delete(id: string) {
    const item = await db.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { movements: true } } },
    });
    if (!item) throw new AppError('Producto no encontrado', 404);

    // Soft delete siempre — preservar historial de movimientos
    return db.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, name: true },
    });
  },

  // ── Stock Management ────────────────────────────────────────────────────────

  async getLowStock(sectionId?: string) {
    const items = await db.inventoryItem.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(sectionId && { sectionId }),
      },
      select: {
        id: true, name: true, code: true, unit: true,
        quantityCurrent: true, quantityMinimum: true,
        section: { select: { id: true, name: true, color: true, icon: true } },
        stockAlerts: {
          where: { isResolved: false },
          select: { id: true, createdAt: true },
          take: 1,
        },
      },
      orderBy: { quantityCurrent: 'asc' },
    });

    return items
      .filter(i => Number(i.quantityCurrent) <= Number(i.quantityMinimum))
      .map(i => ({
        ...i,
        stockStatus: Number(i.quantityCurrent) === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        deficit: Math.max(0, Number(i.quantityMinimum) - Number(i.quantityCurrent)),
      }));
  },

  async getStockSummary() {
    const [total, active, lowStock, outOfStock] = await Promise.all([
      db.inventoryItem.count({ where: { deletedAt: null } }),
      db.inventoryItem.count({ where: { deletedAt: null, isActive: true } }),
      db.inventoryItem.count({
        where: {
          deletedAt: null, isActive: true,
          // Workaround: usar raw para comparar columnas
        },
      }),
      db.inventoryItem.count({
        where: { deletedAt: null, isActive: true, quantityCurrent: { lte: 0 } },
      }),
    ]);

    return { total, active, lowStock, outOfStock };
  },
};
