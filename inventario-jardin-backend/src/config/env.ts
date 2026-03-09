// =============================================================================
// src/config/env.ts
// Carga y valida todas las variables de entorno al arrancar.
// Si falta alguna OBLIGATORIA → el servidor no inicia (fail-fast).
// =============================================================================

import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Variable de entorno requerida: "${key}"\n` +
      `   Revisa tu archivo .env y asegúrate de definirla.`
    );
  }
  return value.trim();
}

function optional(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) {
    throw new Error(`Variable "${key}" debe ser un número entero, recibido: "${val}"`);
  }
  return parsed;
}

// ── Variables validadas ───────────────────────────────────────────────────────

export const env = {
  // Entorno
  NODE_ENV:    optional('NODE_ENV', 'development'),
  IS_PROD:     process.env.NODE_ENV === 'production',
  IS_DEV:      process.env.NODE_ENV !== 'production',
  PORT:        optionalInt('PORT', 3001),
  APP_NAME:    optional('APP_NAME', 'Inventario Jardín'),
  API_VERSION: optional('API_VERSION', 'v1'),

  // Base de datos
  DATABASE_URL: required('DATABASE_URL'),

  // JWT
  JWT_ACCESS_SECRET:     required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET:    required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN:  optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Seguridad
  BCRYPT_ROUNDS: optionalInt('BCRYPT_ROUNDS', 12),
  CORS_ALLOWED_ORIGINS: optional('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:    optionalInt('RATE_LIMIT_WINDOW_MS', 60000),
  RATE_LIMIT_MAX_REQUESTS: optionalInt('RATE_LIMIT_MAX_REQUESTS', 100),
  RATE_LIMIT_AUTH_MAX:     optionalInt('RATE_LIMIT_AUTH_MAX', 10),

  // Logs
  LOG_LEVEL:     optional('LOG_LEVEL', 'debug'),
  LOG_FILE_PATH: optional('LOG_FILE_PATH', './logs'),
} as const;

// Log de arranque (solo en desarrollo)
if (env.IS_DEV) {
  console.log(`✅ Entorno: ${env.NODE_ENV} | Puerto: ${env.PORT} | API: /api/${env.API_VERSION}`);
}
