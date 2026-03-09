// =============================================================================
// src/routes/settings.routes.ts
// /api/v1/settings
// =============================================================================
import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// GET /settings — PÚBLICO: el login lo necesita antes de autenticarse
router.get('/',      SettingsController.index);

// Las siguientes rutas sí requieren autenticación
router.use(authenticate);

// GET /settings/meta — solo admin (página de ajustes)
router.get('/meta',  requireAdmin, SettingsController.meta);

// PUT /settings — solo admin
router.put('/',      writeLimiter, requireAdmin, SettingsController.update);

export default router;
