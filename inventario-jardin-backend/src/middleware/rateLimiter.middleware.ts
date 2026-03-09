// =============================================================================
// src/middleware/rateLimiter.middleware.ts
// Limitadores de tasa para proteger contra abuso y fuerza bruta.
// =============================================================================

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

function limitHandler(message: string) {
  return (_req: Request, res: Response): void => {
    res.status(429).json({
      success:   false,
      message,
      timestamp: new Date().toISOString(),
    });
  };
}

// General — todos los endpoints de la API
export const generalLimiter = rateLimit({
  windowMs:       env.RATE_LIMIT_WINDOW_MS,
  max:            env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders:  false,
  handler:        limitHandler('Demasiadas solicitudes. Espera un momento e intenta de nuevo.'),
});

// Autenticación — muy estricto contra fuerza bruta
export const authLimiter = rateLimit({
  windowMs:              env.RATE_LIMIT_WINDOW_MS * 15,
  max:                   env.RATE_LIMIT_AUTH_MAX,
  standardHeaders:       true,
  legacyHeaders:         false,
  skipSuccessfulRequests: true,
  handler:               limitHandler('Demasiados intentos de inicio de sesión. Intenta en 15 minutos.'),
});

// Escritura — operaciones de creación/modificación
export const writeLimiter = rateLimit({
  windowMs:       env.RATE_LIMIT_WINDOW_MS,
  max:            Math.floor(env.RATE_LIMIT_MAX_REQUESTS * 0.4),
  standardHeaders: true,
  legacyHeaders:  false,
  handler:        limitHandler('Demasiadas operaciones de escritura. Espera un momento.'),
});
