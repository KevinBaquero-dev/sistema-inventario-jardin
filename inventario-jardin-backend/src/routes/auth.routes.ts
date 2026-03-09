// =============================================================================
// src/routes/auth.routes.ts
// Rutas de autenticación — las únicas que no requieren JWT previo.
// =============================================================================

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// POST /api/v1/auth/login — Login, devuelve access + refresh token
router.post('/login', authLimiter, AuthController.login);

// POST /api/v1/auth/refresh — Renueva access token con refresh token
router.post('/refresh', AuthController.refresh);

// POST /api/v1/auth/logout — Revoca el refresh token (requiere auth)
router.post('/logout', authenticate, AuthController.logout);

// GET /api/v1/auth/me — Devuelve datos del usuario actual
router.get('/me', authenticate, AuthController.me);

// PUT /api/v1/auth/change-password — Cambia contraseña del usuario actual
router.put('/change-password', authenticate, AuthController.changePassword);

export default router;
