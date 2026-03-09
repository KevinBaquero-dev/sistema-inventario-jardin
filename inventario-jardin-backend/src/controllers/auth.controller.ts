// =============================================================================
// src/controllers/auth.controller.ts
// Controlador de autenticación. Solo parsing HTTP + delegación al service.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

// ── Schemas de validación ─────────────────────────────────────────────────────

const LoginSchema = z.object({
  email:    z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

const LogoutSchema = z.object({
  tokenId: z.string().uuid('tokenId debe ser un UUID').optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una letra mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número'),
});

// ── Controlador ───────────────────────────────────────────────────────────────

export const AuthController = {

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const result = await AuthService.login(
        email, password, req.ip, req.headers['user-agent']
      );
      sendSuccess(res, result, 'Inicio de sesión exitoso');
    } catch (e) { next(e); }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = RefreshSchema.parse(req.body);
      const result = await AuthService.refreshToken(refreshToken);
      sendSuccess(res, result, 'Token renovado');
    } catch (e) { next(e); }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tokenId } = LogoutSchema.parse(req.body);
      if (tokenId) await AuthService.logout(tokenId);
      sendSuccess(res, null, 'Sesión cerrada');
    } catch (e) { next(e); }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      sendSuccess(res, user, 'Perfil obtenido');
    } catch (e) { next(e); }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
      const userId = (req as AuthenticatedRequest).user.id;
      await AuthService.changePassword(userId, currentPassword, newPassword);
      sendSuccess(res, null, 'Contraseña actualizada');
    } catch (e) { next(e); }
  },
};
