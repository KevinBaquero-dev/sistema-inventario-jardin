// =============================================================================
// src/utils/jwt.ts
// Funciones para firmar y verificar JWT (access token + refresh token).
// Access token: 15 minutos — enviado en cada request como Bearer token.
// Refresh token: 7 días — almacenado en BD, usado para renovar access tokens.
// =============================================================================

import jwt, { type SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { JwtPayload, JwtRefreshPayload } from '../types';

// ── Access Token ──────────────────────────────────────────────────────────────

export function signAccessToken(payload: {
  id: string;
  email: string;
  role: UserRole;
}): string {
  return jwt.sign(
    { email: payload.email, role: payload.role },
    env.JWT_ACCESS_SECRET,
    { subject: payload.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  return decoded;
}

// ── Refresh Token ─────────────────────────────────────────────────────────────

export function signRefreshToken(payload: {
  userId: string;
  tokenId: string;
}): string {
  return jwt.sign(
    { tokenId: payload.tokenId },
    env.JWT_REFRESH_SECRET,
    { subject: payload.userId, expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] }
  );
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  return decoded;
}

// ── Helpers de tiempo ─────────────────────────────────────────────────────────

export function getRefreshTokenExpiresAt(): Date {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
