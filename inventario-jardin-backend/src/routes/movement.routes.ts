// =============================================================================
// src/routes/movement.routes.ts
// /api/v1/movements
// =============================================================================
import { Router } from 'express';
import { MovementController } from '../controllers/movement.controller';
import { authenticate, requireCoordinatorOrAbove } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

// Rutas específicas PRIMERO (antes de /:id para no confundirse)
router.get('/report',                 requireCoordinatorOrAbove, MovementController.report);
router.get('/export/excel',           requireCoordinatorOrAbove, MovementController.exportExcel);
router.get('/export/pdf',             requireCoordinatorOrAbove, MovementController.exportPDF);
router.get('/item/:itemId/history',   MovementController.itemHistory);

// CRUD
router.get('/',    MovementController.index);
router.get('/:id', MovementController.show);
router.post('/',   writeLimiter, MovementController.create);  // Todos los roles autenticados

export default router;
