// =============================================================================
// src/types/index.ts
// Tipos globales compartidos en todo el backend
// =============================================================================

import { Request } from 'express';
import { UserRole } from '@prisma/client';

// ── Request autenticado ───────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// ── Respuesta API estándar ────────────────────────────────────────────────────

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
  timestamp: string;
}

// ── Paginación ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

// ── Filtros de inventario ─────────────────────────────────────────────────────

export interface InventoryFilters extends PaginationQuery {
  sectionId?: string;
  isActive?: boolean | string;
  unit?: string;
  lowStock?: boolean | string;
}

// ── Filtros de movimientos ────────────────────────────────────────────────────

export interface MovementFilters extends PaginationQuery {
  itemId?: string;
  sectionId?: string;
  movementType?: string;
  status?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── JWT Payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}
