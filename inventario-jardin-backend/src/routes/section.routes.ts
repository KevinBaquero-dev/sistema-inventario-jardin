// =============================================================================
// src/routes/section.routes.ts
// /api/v1/sections
// =============================================================================
import { Router } from 'express';
import { SectionController } from '../controllers/section.controller';
import { authenticate, requireAdmin, requireCoordinatorOrAbove } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Secciones ─────────────────────────────────────────────────────────────────

router.get('/',    SectionController.index);           // Todos los roles
router.get('/:id', SectionController.show);            // Todos los roles

router.post('/',    writeLimiter, requireCoordinatorOrAbove, SectionController.create);
router.put('/:id',  writeLimiter, requireCoordinatorOrAbove, SectionController.update);
router.delete('/:id', requireAdmin, SectionController.destroy);

// ── Campos personalizados por sección ─────────────────────────────────────────

router.get('/:sectionId/fields', SectionController.getFields);
router.post('/:sectionId/fields', writeLimiter, requireCoordinatorOrAbove, SectionController.createField);
router.put('/:sectionId/fields/:fieldId', writeLimiter, requireCoordinatorOrAbove, SectionController.updateField);
router.delete('/:sectionId/fields/:fieldId', requireAdmin, SectionController.deleteField);

export default router;
