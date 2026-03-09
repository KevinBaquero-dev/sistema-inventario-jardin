// =============================================================================
// src/utils/response.ts
// Helpers para respuestas HTTP estandarizadas en toda la API.
// TODOS los endpoints responden con la misma estructura JSON.
// =============================================================================

import { Response } from 'express';
import { ApiResponse, PaginationMeta, PaginatedResult, PaginationQuery } from '../types';

// ── Respuesta de éxito ────────────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operación exitosa',
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(body);
}

// ── Respuesta de error ────────────────────────────────────────────────────────

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errorDetail?: string
): Response {
  const body: ApiResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(errorDetail && { error: errorDetail }),
  };
  return res.status(statusCode).json(body);
}

// ── Helpers de paginación ─────────────────────────────────────────────────────

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function parsePaginationQuery(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
  sortOrder: 'asc' | 'desc';
} {
  const page  = Math.max(1, parseInt(String(query.page  ?? 1), 10)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? 20), 10) || 20));
  const skip  = (page - 1) * limit;
  const sortOrder: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { page, limit, skip, sortOrder };
}

export function makePaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  };
}
