// =============================================================================
// src/middleware/validate.middleware.ts
// Middleware genérico de validación Zod. Retorna 422 con detalles del error.
// Uso: router.post('/', validate(CreateItemSchema), controller.create)
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { sendError } from '../utils/response';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errorDetail = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(' | ');
      sendError(res, 'Datos de entrada inválidos', 422, errorDetail);
      return;
    }

    // Sobreescribir con datos parseados y sanitizados por Zod
    req[target] = result.data as typeof req[typeof target];
    next();
  };
}

// Schema reutilizable para UUIDs en params
export const uuidParam = z.object({
  id: z.string().uuid('ID inválido, debe ser UUID'),
});
