// =============================================================================
// src/routes/user.routes.ts
// /api/v1/users — solo admins
// =============================================================================
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { writeLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Todas las rutas de usuarios son solo para admins
router.use(authenticate, requireAdmin);

router.get('/',    UserController.index);
router.get('/:id', UserController.show);
router.post('/',   writeLimiter, UserController.create);
router.put('/:id', writeLimiter, UserController.update);
router.get('/:id/sections',  UserController.getSections);
router.put('/:id/sections',  writeLimiter, UserController.setSections);
router.post('/:id/reset-password', writeLimiter, UserController.resetPassword);
router.delete('/:id', UserController.destroy);

export default router;
