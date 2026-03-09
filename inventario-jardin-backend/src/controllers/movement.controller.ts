// =============================================================================
// src/controllers/movement.controller.ts
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import { MovementService } from '../services/movement.service';
import { sendExcel, sendPDF, ExportParams } from '../services/export.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { UserService } from '../services/user.service';
import {
  CreateMovementSchema,
  MovementQuerySchema,
  ReportQuerySchema,
} from '../validators/movement.validator';

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const MovementController = {

  // GET /movements
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      const query = MovementQuerySchema.parse(req.query);
      // Si el usuario tiene restricciones, inyectar el filtro de secciones
      if (allowedIds !== null) {
        const requestedSection = query.sectionId;
        if (requestedSection && !allowedIds.includes(requestedSection)) {
          sendSuccess(res, [], 'Movimientos obtenidos', 200, undefined);
          return;
        }
        if (!requestedSection) {
          (query as Record<string, unknown>).allowedSectionIds = allowedIds;
        }
      }
      const result = await MovementService.findAll(query);
      sendSuccess(res, result.data, 'Movimientos obtenidos', 200, result.meta);
    } catch (e) { next(e); }
  },

  // GET /movements/report
  async report(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user  = getUser(req);
      const query = ReportQuerySchema.parse(req.query);
      // Aplicar filtro de secciones permitidas igual que en el listado
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null) {
        const requestedSection = query.sectionId;
        if (requestedSection && !allowedIds.includes(requestedSection)) {
          sendSuccess(res, { movements: [], summary: {}, period: {} }, 'Reporte generado');
          return;
        }
        if (!requestedSection) {
          (query as Record<string, unknown>).allowedSectionIds = allowedIds;
        }
      }
      const result = await MovementService.getReport(query);
      void AuditService.exported({
        userId: user.id, entityType: 'inventory_movements',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Reporte generado');
    } catch (e) { next(e); }
  },

  // GET /movements/:id
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movement = await MovementService.findById(req.params.id);
      sendSuccess(res, movement, 'Movimiento obtenido');
    } catch (e) { next(e); }
  },

  // GET /movements/export/excel
  async exportExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user  = getUser(req);
      const query = ReportQuerySchema.parse(req.query);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null) {
        if (query.sectionId && !allowedIds.includes(query.sectionId)) {
          res.status(403).json({ success: false, message: 'Sin acceso a esa sección' }); return;
        }
        if (!query.sectionId) (query as Record<string, unknown>).allowedSectionIds = allowedIds;
      }
      const report     = await MovementService.getReport(query);
      const sectionName = query.sectionId
        ? report.movements[0]?.item?.section?.name
        : undefined;
      const params: ExportParams = {
        movements:   report.movements as unknown as ExportParams['movements'],
        summary:     report.summary,
        dateFrom:    query.dateFrom,
        dateTo:      query.dateTo,
        sectionName,
        sections: report.sections as unknown as ExportParams['sections'],
      };
      await sendExcel(res, params);
    } catch (e) { next(e); }
  },

  // GET /movements/export/pdf
  async exportPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user  = getUser(req);
      const query = ReportQuerySchema.parse(req.query);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null) {
        if (query.sectionId && !allowedIds.includes(query.sectionId)) {
          res.status(403).json({ success: false, message: 'Sin acceso a esa sección' }); return;
        }
        if (!query.sectionId) (query as Record<string, unknown>).allowedSectionIds = allowedIds;
      }
      const report     = await MovementService.getReport(query);
      const sectionName = query.sectionId
        ? report.movements[0]?.item?.section?.name
        : undefined;
      const params: ExportParams = {
        movements:   report.movements as unknown as ExportParams['movements'],
        summary:     report.summary,
        dateFrom:    query.dateFrom,
        dateTo:      query.dateTo,
        sectionName,
        sections: report.sections as unknown as ExportParams['sections'],
      };
      await sendPDF(res, params);
    } catch (e) { next(e); }
  },

  // GET /movements/item/:itemId/history
  async itemHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await MovementService.getItemHistory(req.params.itemId);
      sendSuccess(res, result, 'Historial obtenido');
    } catch (e) { next(e); }
  },

  // POST /movements
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input    = CreateMovementSchema.parse(req.body);
      const user     = getUser(req);
      // Verificar que el usuario tiene acceso a la sección del producto
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null) {
        const product = await (await import('../services/product.service')).ProductService.findById(input.itemId);
        if (!allowedIds.includes(product.section.id)) {
          res.status(403).json({ success: false, message: 'No tienes acceso a la sección de este producto' });
          return;
        }
      }
      const movement = await MovementService.create(input, user.id);
      void AuditService.created({
        userId: user.id, entityType: 'inventory_movements', entityId: movement.id,
        newValues: {
          itemId: movement.item.id, type: movement.movementType,
          quantity: movement.quantity, before: movement.quantityBefore,
          after: movement.quantityAfter,
        },
        ipAddress: req.ip,
      });
      sendSuccess(res, movement, 'Movimiento registrado', 201);
    } catch (e) { next(e); }
  },
};
