// =============================================================================
// src/config/database.ts
// Singleton de Prisma con reconexión automática y logging de queries lentas.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

// ── Singleton para evitar múltiples conexiones en hot-reload ─────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: env.IS_DEV
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      : [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ],
  });

  // Log queries lentas en desarrollo (> 500ms)
  if (env.IS_DEV) {
    client.$on('query' as never, (e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        logger.warn(`⚠️  Query lenta ${e.duration}ms: ${e.query.substring(0, 120)}`);
      }
    });
  }

  client.$on('warn' as never, (e: { message: string }) => {
    logger.warn('Prisma warn:', e.message);
  });

  client.$on('error' as never, (e: { message: string }) => {
    logger.error('Prisma error:', e.message);
  });

  return client;
};

export const db = global.__prisma ?? createPrismaClient();

// Reutilizar en hot-reload (ts-node-dev no acumula conexiones)
if (env.IS_DEV) {
  global.__prisma = db;
}

// ── Función de conexión con retry ─────────────────────────────────────────────

export async function connectDatabase(maxRetries = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.$connect();
      logger.info('✅ Base de datos conectada');
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      logger.warn(
        `⚠️  Intento ${attempt}/${maxRetries} de conexión a BD fallido. ` +
        (isLastAttempt ? 'Sin más reintentos.' : 'Reintentando en 3s...')
      );
      if (isLastAttempt) throw error;
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await db.$disconnect();
  logger.info('🔌 Base de datos desconectada');
}
