// =============================================================================
// src/app.ts
// Configuración de Express. Separado de server.ts para facilitar testing.
// =============================================================================

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { logger, morganStream } from './config/logger';
import { generalLimiter } from './middleware/rateLimiter.middleware';
import { globalErrorHandler, notFoundHandler } from './middleware/error.middleware';
import apiRouter from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── Trust proxy (necesario para IP real detrás de Nginx/Traefik) ────────────
  app.set('trust proxy', 1);

  // ── Seguridad HTTP ───────────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: env.IS_PROD ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Permitir sin origin: Postman, curl, apps móviles, requests internos
      if (!origin) return callback(null, true);

      if (env.CORS_ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`🚫 CORS bloqueado para origen: ${origin}`);
      callback(new Error(`Origen no permitido: ${origin}`));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ── Compresión GZIP ──────────────────────────────────────────────────────────
  app.use(compression());

  // ── Parsing de body ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── Logging HTTP ─────────────────────────────────────────────────────────────
  app.use(morgan(env.IS_DEV ? 'dev' : 'combined', { stream: morganStream }));

  // ── Rate limiting global ─────────────────────────────────────────────────────
  app.use(`/api/${env.API_VERSION}`, generalLimiter);

  // ── Rutas ────────────────────────────────────────────────────────────────────
  app.use(`/api/${env.API_VERSION}`, apiRouter);

  // ── Handlers finales (SIEMPRE al final) ──────────────────────────────────────
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
