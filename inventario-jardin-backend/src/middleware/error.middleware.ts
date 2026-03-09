// =============================================================================
// src/middleware/error.middleware.ts
// Manejador global de errores. Captura cualquier error que llegue via next(err).
// DEBE ser el ÚLTIMO middleware en app.ts.
// Responde SIEMPRE con JSON consistente, nunca expone stack traces en producción.
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiResponse } from '../types';

// ── Clase de error personalizada ──────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // V8 — mejora stack traces
    if (Error.captureStackTrace) {
      (Error as { captureStackTrace?: (t: object, c: unknown) => void }).captureStackTrace?.(this, this.constructor);
    }
  }
}

// ── Type guards para narrowing de errores de terceros ────────────────────────

function isPrismaKnownError(e: unknown): e is {
  code: string;
  meta?: { target?: string[] };
} {
  return (
    typeof e === 'object' && e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string' &&
    String((e as { code: unknown }).code).startsWith('P')
  );
}

function isZodError(e: unknown): e is {
  name: string;
  errors: Array<{ path: Array<string | number>; message: string }>;
} {
  return (
    typeof e === 'object' && e !== null &&
    'name' in e && (e as { name: string }).name === 'ZodError' &&
    'errors' in e && Array.isArray((e as { errors: unknown[] }).errors)
  );
}

// ── Handler principal ─────────────────────────────────────────────────────────

export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message    = 'Error interno del servidor';
  let errorDetail: string | undefined;

  // Error de la aplicación (conocido)
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message    = error.message;
    if (!error.isOperational) {
      logger.error('💥 BUG no operacional:', { message: error.message, stack: error.stack });
    }
  }

  // Error de validación Zod
  else if (isZodError(error)) {
    statusCode  = 422;
    message     = 'Datos de entrada inválidos';
    errorDetail = error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(' | ');
  }

  // Errores JWT
  else if (
    error instanceof Error &&
    (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')
  ) {
    statusCode = 401;
    message = error.name === 'TokenExpiredError'
      ? 'El token ha expirado, inicia sesión nuevamente'
      : 'Token de autenticación inválido';
  }

  // Errores de Prisma (base de datos)
  else if (isPrismaKnownError(error)) {
    const prismaErr = error as { code: string; meta?: { target?: string[] } };
    switch (prismaErr.code) {
      case 'P2002':
        statusCode = 409;
        message = prismaErr.meta?.target?.length
          ? `El campo '${prismaErr.meta.target.join(', ')}' ya está en uso`
          : 'Ya existe un registro con ese valor';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Registro no encontrado';
        break;
      case 'P2003':
        statusCode = 409;
        message = 'Referencia inválida: el registro relacionado no existe';
        break;
      case 'P2014':
        statusCode = 409;
        message = 'No se puede eliminar: hay registros dependientes';
        break;
      default:
        logger.error(`Prisma error ${prismaErr.code}:`, error);
    }
  }

  // JSON malformado en el body
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message    = 'JSON inválido en el cuerpo de la solicitud';
  }

  // Error genérico inesperado
  else {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('❌ Error no manejado:', {
      message: err.message,
      stack:   err.stack,
      path:    req.originalUrl,
      method:  req.method,
    });
  }

  const response: ApiResponse = {
    success:   false,
    message,
    timestamp: new Date().toISOString(),
    ...(errorDetail && { error: errorDetail }),
  };

  res.status(statusCode).json(response);
}

// ── Handler 404 ───────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success:   false,
    message:   `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  } satisfies ApiResponse);
}
