// =============================================================================
// src/controllers/settings.controller.ts
// GET /settings       — todos los roles (para cargar logo/nombre en el sidebar)
// PUT /settings       — solo ADMIN
// GET /settings/meta  — solo ADMIN (con metadata de quién actualizó)
// =============================================================================
import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { UpdateSettingsSchema } from '../validators/settings.validator';

const getUser = (req: Request) => (req as AuthenticatedRequest).user;

export const SettingsController = {

  // GET /settings — público para usuarios autenticados (sidebar lo usa)
  async index(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await SettingsService.getAll();
      sendSuccess(res, config, 'Configuración obtenida');
    } catch (e) { next(e); }
  },

  // GET /settings/meta — solo admin, con historial de cambios
  async meta(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await SettingsService.getAllWithMeta();
      sendSuccess(res, config, 'Configuración con metadata');
    } catch (e) { next(e); }
  },

  // PUT /settings — solo admin
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input  = UpdateSettingsSchema.parse(req.body);
      const user   = getUser(req);
      const config = await SettingsService.update(input, user.id);

      void AuditService.updated({
        userId:     user.id,
        entityType: 'system_config',
        entityId:   'global',
        newValues:  input,
        ipAddress:  req.ip,
      });

      sendSuccess(res, config, 'Configuración actualizada');
    } catch (e) { next(e); }
  },
};
