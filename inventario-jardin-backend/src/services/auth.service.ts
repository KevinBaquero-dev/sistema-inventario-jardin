// =============================================================================
// src/services/auth.service.ts
// Lógica de negocio de autenticación.
// =============================================================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
} from '../utils/jwt';
import { AuditAction } from '@prisma/client';

// ── Audit log (no bloquea el flujo si falla) ─────────────────────────────────

export async function writeAuditLog(params: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.auditLog.create({ data: params });
  } catch (e) {
    logger.warn('No se pudo escribir audit log:', e);
  }
}

// ── Tipos de resultado ────────────────────────────────────────────────────────

export interface SectionAccessEntry {
  section: {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    isActive: boolean;
  };
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    mustChangePassword: boolean;
    sectionAccess: SectionAccessEntry[];
  };
}

// ── AuthService ───────────────────────────────────────────────────────────────

export const AuthService = {

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {

    const user = await db.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      include: {
        sectionAccess: {
          select: {
            section: {
              select: { id: true, name: true, icon: true, color: true, isActive: true },
            },
          },
        },
      },
    });

    // Mismo mensaje para email no encontrado y contraseña incorrecta
    // (evita user enumeration)
    if (!user) {
      await writeAuditLog({
        action: 'LOGIN', entityType: 'users',
        success: false, errorMessage: 'Email no encontrado', ipAddress,
      });
      throw new AppError('Credenciales incorrectas', 401);
    }

    // Cuenta bloqueada por intentos fallidos
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Cuenta bloqueada. Intenta en ${mins} minuto(s)`, 423);
    }

    // Cuenta inactiva
    if (user.status !== 'ACTIVE') {
      throw new AppError('Cuenta inactiva. Contacta al administrador.', 403);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      const newCount = user.failedLoginCount + 1;
      const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60_000) : null;

      await db.user.update({
        where: { id: user.id },
        data:  { failedLoginCount: newCount, lockedUntil: lockUntil },
      });

      await writeAuditLog({
        userId: user.id, action: 'LOGIN', entityType: 'users',
        entityId: user.id, success: false, errorMessage: 'Contraseña incorrecta', ipAddress,
      });

      throw new AppError('Credenciales incorrectas', 401);
    }

    // Login exitoso — resetear contadores
    await db.user.update({
      where: { id: user.id },
      data:  { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Crear refresh token
    const rawToken  = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const dbToken = await db.refreshToken.create({
      data: {
        userId:     user.id,
        tokenHash,
        deviceInfo: userAgent,
        ipAddress,
        expiresAt:  getRefreshTokenExpiresAt(),
      },
    });

    const accessToken  = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenId: dbToken.id });

    await writeAuditLog({
      userId: user.id, action: 'LOGIN', entityType: 'users',
      entityId: user.id, success: true, ipAddress, userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:                 user.id,
        email:              user.email,
        fullName:           user.fullName,
        role:               user.role,
        mustChangePassword: user.mustChangePassword,
        sectionAccess:      user.sectionAccess ?? [],
      },
    };
  },

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Refresh token inválido o expirado', 401);
    }

    const dbToken = await db.refreshToken.findFirst({
      where: {
        id:        payload.tokenId,
        userId:    payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!dbToken) throw new AppError('Refresh token inválido, expirado o revocado', 401);
    if (dbToken.user.status !== 'ACTIVE' || dbToken.user.deletedAt) {
      throw new AppError('Usuario inactivo', 403);
    }

    const accessToken = signAccessToken({
      id:    dbToken.user.id,
      email: dbToken.user.email,
      role:  dbToken.user.role,
    });

    return { accessToken };
  },

  async logout(tokenId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new AppError('Contraseña actual incorrecta', 400);

    if (currentPassword === newPassword) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual', 400);
    }

    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await db.user.update({
      where: { id: userId },
      data:  { passwordHash: newHash, mustChangePassword: false },
    });

    // Revocar todas las sesiones activas por seguridad
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });

    logger.info(`Contraseña cambiada para usuario ${userId}`);
  },
};
