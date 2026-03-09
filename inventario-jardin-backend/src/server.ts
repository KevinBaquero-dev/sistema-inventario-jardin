// =============================================================================
// src/server.ts
// Punto de entrada del servidor. Inicia Express + conecta BD + maneja señales.
// =============================================================================

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

async function main() {
  // 1. Conectar base de datos
  await connectDatabase();

  // 2. Crear aplicación Express
  const app = createApp();

  // 3. Iniciar servidor HTTP
  const server = app.listen(env.PORT, () => {
    logger.info(`
🚀 Servidor iniciado
   App:     ${env.APP_NAME}
   URL:     http://localhost:${env.PORT}/api/${env.API_VERSION}
   Health:  http://localhost:${env.PORT}/api/${env.API_VERSION}/health
   Entorno: ${env.NODE_ENV}
    `.trim());
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────────

  async function shutdown(signal: string) {
    logger.info(`\n⚡ ${signal} recibido. Cerrando servidor...`);

    // Dejar de aceptar nuevas conexiones
    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('✅ Cierre limpio completado');
        process.exit(0);
      } catch (err) {
        logger.error('❌ Error al cerrar:', err);
        process.exit(1);
      }
    });

    // Forzar cierre si tarda más de 30 segundos
    setTimeout(() => {
      logger.error('⏱️ Timeout de cierre. Forzando salida.');
      process.exit(1);
    }, 30_000);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  // Errores no capturados — loggear y cerrar limpiamente
  process.on('uncaughtException', (err) => {
    logger.error('💥 uncaughtException:', { message: err.message, stack: err.stack });
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('💥 unhandledRejection:', reason);
    void shutdown('unhandledRejection');
  });
}

// Iniciar
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ Error fatal al iniciar el servidor:', message);
  process.exit(1);
});
