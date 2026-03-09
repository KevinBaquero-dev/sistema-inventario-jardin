// =============================================================================
// src/middleware/auth.middleware.ts
// Verifica el JWT en el header Authorization y carga req.user.
// Siempre usar authenticate ANTES de requireRole en las rutas.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

// ── Autenticación ─────────────────────────────────────────────────────────────

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Token de autenticación requerido', 401);
    return;
  }

  const token = authHeader.slice(7).trim(); // quitar "Bearer "

  if (!token) {
    sendError(res, 'Token vacío', 401);
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    // Verificar que el payload tenga los campos obligatorios
    if (!payload.sub || !payload.email || !payload.role) {
      sendError(res, 'Token con estructura inválida', 401);
      return;
    }

    (req as AuthenticatedRequest).user = {
      id:    payload.sub,
      email: payload.email,
      role:  payload.role,
    };

    next();
  } catch (error) {
    const isExpired = error instanceof Error && error.name === 'TokenExpiredError';
    sendError(
      res,
      isExpired
        ? 'El token ha expirado. Inicia sesión nuevamente.'
        : 'Token inválido o malformado',
      401
    );
  }
}

// ── Autorización por rol ──────────────────────────────────────────────────────

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendError(res, 'No autenticado', 401);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      sendError(
        res,
        `Acceso denegado. Se requiere: ${allowedRoles.join(' o ')}`,
        403
      );
      return;
    }

    next();
  };
}

// ── Aliases de conveniencia ───────────────────────────────────────────────────

/** Solo administradores */
export const requireAdmin = requireRole('ADMIN');

/** Coordinadores y administradores */
export const requireCoordinatorOrAbove = requireRole('ADMIN', 'COORDINATOR');
