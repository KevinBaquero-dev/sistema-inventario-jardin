// =============================================================================
// src/controllers/section.controller.ts
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import { SectionService, CustomFieldService } from '../services/section.service';
import { UserService } from '../services/user.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import {
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateCustomFieldSchema,
  UpdateCustomFieldSchema,
} from '../validators/section.validator';

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const SectionController = {

  // GET /sections
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      const result = await SectionService.findAll(req.query, allowedIds);
      sendSuccess(res, result.data, 'Secciones obtenidas', 200, result.meta);
    } catch (e) { next(e); }
  },

  // GET /sections/:id
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = getUser(req);
      const allowedIds = await UserService.getAllowedSectionIds(user.id, user.role);
      if (allowedIds !== null && !allowedIds.includes(req.params.id)) {
        res.status(403).json({ success: false, message: 'No tienes acceso a esta sección' });
        return;
      }
      const section = await SectionService.findById(req.params.id);
      sendSuccess(res, section, 'Sección obtenida');
    } catch (e) { next(e); }
  },

  // POST /sections
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateSectionSchema.parse(req.body);
      const user  = getUser(req);
      const section = await SectionService.create(input, user.id);
      void AuditService.created({
        userId: user.id, entityType: 'sections', entityId: section.id,
        newValues: { name: section.name }, ipAddress: req.ip,
      });
      sendSuccess(res, section, 'Sección creada', 201);
    } catch (e) { next(e); }
  },

  // PUT /sections/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input   = UpdateSectionSchema.parse(req.body);
      const user    = getUser(req);
      const before  = await SectionService.findById(req.params.id);
      const section = await SectionService.update(req.params.id, input, user.id);
      void AuditService.updated({
        userId: user.id, entityType: 'sections', entityId: section.id,
        oldValues: { name: before.name, isActive: before.isActive },
        newValues: { name: section.name, isActive: section.isActive },
        ipAddress: req.ip,
      });
      sendSuccess(res, section, 'Sección actualizada');
    } catch (e) { next(e); }
  },

  // DELETE /sections/:id
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user   = getUser(req);
      const result = await SectionService.delete(req.params.id);
      void AuditService.deleted({
        userId: user.id, entityType: 'sections', entityId: result.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Sección eliminada');
    } catch (e) { next(e); }
  },

  // ── Custom Fields ──────────────────────────────────────────────────────────

  // GET /sections/:sectionId/fields
  async getFields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fields = await CustomFieldService.findBySectionId(req.params.sectionId);
      sendSuccess(res, fields, 'Campos obtenidos');
    } catch (e) { next(e); }
  },

  // POST /sections/:sectionId/fields
  async createField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateCustomFieldSchema.parse(req.body);
      const user  = getUser(req);
      const field = await CustomFieldService.create(req.params.sectionId, input, user.id);
      void AuditService.created({
        userId: user.id, entityType: 'custom_fields', entityId: field.id,
        newValues: { name: field.name, fieldType: field.fieldType }, ipAddress: req.ip,
      });
      sendSuccess(res, field, 'Campo creado', 201);
    } catch (e) { next(e); }
  },

  // PUT /sections/:sectionId/fields/:fieldId
  async updateField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = UpdateCustomFieldSchema.parse(req.body);
      const field = await CustomFieldService.update(
        req.params.fieldId, req.params.sectionId, input
      );
      void AuditService.updated({
        userId: getUser(req).id, entityType: 'custom_fields', entityId: field.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, field, 'Campo actualizado');
    } catch (e) { next(e); }
  },

  // DELETE /sections/:sectionId/fields/:fieldId
  async deleteField(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CustomFieldService.delete(
        req.params.fieldId, req.params.sectionId
      );
      void AuditService.deleted({
        userId: getUser(req).id, entityType: 'custom_fields', entityId: result.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Campo eliminado');
    } catch (e) { next(e); }
  },
};
