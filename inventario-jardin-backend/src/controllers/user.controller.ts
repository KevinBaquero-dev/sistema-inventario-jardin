// =============================================================================
// src/controllers/user.controller.ts
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import {
  CreateUserSchema,
  UpdateUserSchema,
} from '../validators/user.validator';

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const UserController = {

  // GET /users
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.findAll(req.query);
      sendSuccess(res, result.data, 'Usuarios obtenidos', 200, result.meta);
    } catch (e) { next(e); }
  },

  // GET /users/:id
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.findById(req.params.id);
      sendSuccess(res, user, 'Usuario obtenido');
    } catch (e) { next(e); }
  },

  // POST /users
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input  = CreateUserSchema.parse(req.body);
      const result = await UserService.create(input);
      void AuditService.created({
        userId: getUser(req).id, entityType: 'users', entityId: result.id,
        newValues: { email: result.email, role: result.role }, ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Usuario creado', 201);
    } catch (e) { next(e); }
  },

  // PUT /users/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input  = UpdateUserSchema.parse(req.body);
      const result = await UserService.update(req.params.id, input);
      void AuditService.updated({
        userId: getUser(req).id, entityType: 'users', entityId: result.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Usuario actualizado');
    } catch (e) { next(e); }
  },

  // GET /users/:id/sections
  async getSections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sections = await UserService.getSections(req.params.id);
      sendSuccess(res, sections, 'Secciones del usuario');
    } catch (e) { next(e); }
  },

  // PUT /users/:id/sections
  async setSections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sectionIds } = req.body;
      if (!Array.isArray(sectionIds)) {
        res.status(400).json({ success: false, message: 'sectionIds debe ser un array' });
        return;
      }
      const sections = await UserService.setSections(req.params.id, sectionIds as string[]);
      void AuditService.updated({
        userId: getUser(req).id, entityType: 'users', entityId: req.params.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, sections, 'Secciones actualizadas');
    } catch (e) { next(e); }
  },

  // POST /users/:id/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.resetPassword(req.params.id, req.body.password);
      void AuditService.updated({
        userId: getUser(req).id, entityType: 'users', entityId: req.params.id,
        newValues: { action: 'password_reset' }, ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Contraseña restablecida');
    } catch (e) { next(e); }
  },

  // DELETE /users/:id
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requester = getUser(req);
      const result    = await UserService.delete(req.params.id, requester.id);
      void AuditService.deleted({
        userId: requester.id, entityType: 'users', entityId: result.id,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 'Usuario eliminado');
    } catch (e) { next(e); }
  },
};
