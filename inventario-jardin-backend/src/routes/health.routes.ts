import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../config/database';
import { env } from '../config/env';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
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

export default router;
