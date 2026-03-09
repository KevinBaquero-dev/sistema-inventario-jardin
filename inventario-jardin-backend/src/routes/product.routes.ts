// =============================================================================
// src/routes/product.routes.ts
// /api/v1/products
// Orden importante: rutas específicas ANTES que rutas con parámetros (:id)
// =============================================================================
import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, requireAdmin, requireCoordinatorOrAbove } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

// Rutas específicas PRIMERO (antes de /:id)
router.get('/low-stock',     ProductController.lowStock);
router.get('/stock-summary', ProductController.stockSummary);

// CRUD base
router.get('/',    ProductController.index);
router.get('/:id', ProductController.show);

router.post('/',    writeLimiter, requireCoordinatorOrAbove, ProductController.create);
router.put('/:id',  writeLimiter, requireCoordinatorOrAbove, ProductController.update);
router.delete('/:id', requireAdmin, ProductController.destroy);

export default router;
