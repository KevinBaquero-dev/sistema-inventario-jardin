// =============================================================================
// src/config/logger.ts
// Sistema de logs con Winston.
// - Desarrollo: consola colorizada y legible
// - Producción: archivos JSON rotativos por día
// =============================================================================

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Crear directorio de logs si no existe
const logDir = path.resolve(env.LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ── Formato para consola (desarrollo) ────────────────────────────────────────

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf((info) => {
    const { level, message, timestamp: ts, stack, ...meta } = info;
    const metaStr = Object.keys(meta).length > 0
      ? `\n  ${JSON.stringify(meta, null, 2)}`
      : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} ${level} ${String(message)}${metaStr}${stackStr}`;
  })
);

// ── Formato para archivos (producción) ───────────────────────────────────────

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// ── Transportes ───────────────────────────────────────────────────────────────

const transports: winston.transport[] = [];

if (env.IS_DEV) {
  // Desarrollo: solo consola, colorizada
  transports.push(
    new winston.transports.Console({ format: consoleFormat })
  );
} else {
  // Producción: archivos rotativos diarios + consola para errores críticos
  transports.push(
    new DailyRotateFile({
      filename:   path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level:      'error',
      format:     fileFormat,
      maxSize:    '20m',
      maxFiles:   '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename:   path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format:     fileFormat,
      maxSize:    '50m',
      maxFiles:   '30d',
      zippedArchive: true,
    }),
    new winston.transports.Console({
      level:  'error',
      format: consoleFormat,
    })
  );
}

// ── Instancia del logger ──────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level:       env.LOG_LEVEL,
  transports,
  exitOnError: false,
});

// ── Stream para Morgan (logs HTTP) ───────────────────────────────────────────

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
