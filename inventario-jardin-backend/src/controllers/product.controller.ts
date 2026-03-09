// =============================================================================
// src/controllers/product.controller.ts
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, InventoryFilters } from '../types';
import { CreateProductSchema, UpdateProductSchema } from '../validators/product.validator';
import { UserService } from '../services/user.service';

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const ProductController = {

  // GET /products
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      const filters = { ...req.query } as InventoryFilters & Record<string, unknown>;
      if (allowedIds !== null) {
        const requestedSection = filters.sectionId as string | undefined;
        if (requestedSection && !allowedIds.includes(requestedSection)) {
          sendSuccess(res, [], 'Productos obtenidos', 200, undefined);
          return;
        }
        if (!requestedSection) {
          filters.allowedSectionIds = allowedIds;
        }
      }
      const result = await ProductService.findAll(filters);
      sendSuccess(res, result.data, 'Productos obtenidos', 200, result.meta);
    } catch (e) { next(e); }
  },

  // GET /products/:id
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.findById(req.params.id);
      sendSuccess(res, product, 'Producto obtenido');
    } catch (e) { next(e); }
  },

  // POST /products
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input   = CreateProductSchema.parse(req.body);
      const user    = getUser(req);
      // Verificar que el usuario tiene acceso a la sección destino
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null && !allowedIds.includes(input.sectionId)) {
        res.status(403).json({ success: false, message: 'No tienes acceso a esa sección' });
        return;
      }
      const product = await ProductService.create(input, user.id);
      void AuditService.created({
        userId: user.id, entityType: 'inventory_items', entityId: product.id,
        newValues: {
          name: product.name, code: product.code,
          sectionId: product.section.id, quantityCurrent: product.quantityCurrent,
        },
        ipAddress: req.ip,
      });
      sendSuccess(res, product, 'Producto creado', 201);
    } catch (e) { next(e); }
  },

  // PUT /products/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input   = UpdateProductSchema.parse(req.body);
      const user    = getUser(req);
      const before  = await ProductService.findById(req.params.id);
      // Verificar que el usuario tiene acceso a la sección del producto
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null && !allowedIds.includes(before.section.id)) {
        res.status(403).json({ success: false, message: 'No tienes acceso a la sección de este producto' });
        return;
      }
      const product = await ProductService.update(req.params.id, input, user.id);
      void AuditService.updated({
        userId: user.id, entityType: 'inventory_items', entityId: product.id,
        oldValues: { name: before.name, isActive: before.isActive },
        newValues: { name: product.name, isActive: product.isActive },
        ipAddress: req.ip,
      });
      sendSuccess(res, product, 'Producto actualizado');
    } catch (e) { next(e); }
  },

  // DELETE /products/:id
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user   = getUser(req);
      const result = await ProductService.delete(req.params.id);
      void AuditService.deleted({
        userId: user.id, entityType: 'inventory_items', entityId: result.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Producto eliminado');
    } catch (e) { next(e); }
  },

  // GET /products/low-stock
  async lowStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sectionId = req.query.sectionId as string | undefined;
      const items = await ProductService.getLowStock(sectionId);
      sendSuccess(res, items, `${items.length} producto(s) con stock bajo`);
    } catch (e) { next(e); }
  },

  // GET /products/stock-summary
  async stockSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await ProductService.getStockSummary();
      sendSuccess(res, summary, 'Resumen de stock');
    } catch (e) { next(e); }
  },
};
