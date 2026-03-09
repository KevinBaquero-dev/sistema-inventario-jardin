// =============================================================================
// src/services/audit.service.ts
// Servicio centralizado de auditoría. Nunca lanza errores — el audit log
// NO debe interrumpir el flujo normal del negocio.
// =============================================================================

import { AuditAction } from '@prisma/client';
import { db } from '../config/database';
import { logger } from '../config/logger';

interface AuditParams {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId:       params.userId,
        action:       params.action,
        entityType:   params.entityType,
        entityId:     params.entityId,
        oldValues:    params.oldValues as object | undefined,
        newValues:    params.newValues as object | undefined,
        ipAddress:    params.ipAddress,
        userAgent:    params.userAgent,
        success:      params.success ?? true,
        errorMessage: params.errorMessage,
      },
    });
  } catch (e) {
    // NUNCA relanzar — el audit log no debe romper operaciones de negocio
    logger.warn('⚠️  No se pudo escribir audit log:', {
      action: params.action,
      entity: params.entityType,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

// Helpers semánticos para mayor legibilidad en los servicios
export const AuditService = {
  created:  (params: Omit<AuditParams, 'action'>) => audit({ ...params, action: 'CREATE' }),
  updated:  (params: Omit<AuditParams, 'action'>) => audit({ ...params, action: 'UPDATE' }),
  deleted:  (params: Omit<AuditParams, 'action'>) => audit({ ...params, action: 'DELETE' }),
  exported: (params: Omit<AuditParams, 'action'>) => audit({ ...params, action: 'EXPORT' }),
};
