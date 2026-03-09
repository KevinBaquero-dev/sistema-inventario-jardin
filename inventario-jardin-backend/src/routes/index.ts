// =============================================================================
// src/routes/index.ts
// Router principal — monta todos los módulos bajo /api/v1/
// =============================================================================

import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { env } from '../config/env';

import authRoutes     from './auth.routes';
import userRoutes     from './user.routes';
import sectionRoutes  from './section.routes';
import productRoutes  from './product.routes';
import movementRoutes from './movement.routes';
import settingsRoutes from './settings.routes';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────

router.get('/health', async (_req: Request, res: Response) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch {
    dbStatus = 'error';
  }

  const isHealthy = dbStatus === 'ok';

  res.status(isHealthy ? 200 : 503).json({
    success:     isHealthy,
    message:     isHealthy ? `${env.APP_NAME} operativo` : 'Servicio degradado',
    version:     env.API_VERSION,
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
    uptime:      Math.floor(process.uptime()),
    services: {
      api:      'ok',
      database: dbStatus,
      ...(dbLatencyMs !== null && { dbLatencyMs }),
    },
  });
});

// ── Módulos ────────────────────────────────────────────────────────────────────

router.use('/auth',      authRoutes);
router.use('/users',     userRoutes);
router.use('/sections',  sectionRoutes);
router.use('/products',  productRoutes);
router.use('/movements', movementRoutes);
router.use('/settings',  settingsRoutes);

export default router;
