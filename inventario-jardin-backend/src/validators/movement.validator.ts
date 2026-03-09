// =============================================================================
// src/validators/movement.validator.ts
// =============================================================================
import { z } from 'zod';

export const CreateMovementSchema = z.object({
  itemId: z.string().uuid('itemId inválido'),
  movementType: z.enum(['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT'], {
    errorMap: () => ({ message: 'Tipo debe ser: ENTRY, EXIT, TRANSFER o ADJUSTMENT' }),
  }),
  quantity: z.number()
    .positive('La cantidad debe ser mayor a cero')
    .max(999999, 'Cantidad demasiado grande'),
  supplierId: z.string().uuid().optional().nullable(),
  destinationItemId: z.string().uuid().optional().nullable(),
  referenceNumber: z.string().max(100).trim().optional(),
  reason: z.string().max(500).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
  unitCost: z.number().min(0).optional().nullable(),
  movementDate: z.string().datetime({ message: 'Fecha inválida, usar ISO 8601' }).optional(),
})
.refine(
  (d) => d.movementType !== 'TRANSFER' || (!!d.destinationItemId),
  { message: 'TRANSFER requiere destinationItemId', path: ['destinationItemId'] }
)
.refine(
  (d) => !d.destinationItemId || d.destinationItemId !== d.itemId,
  { message: 'El producto origen y destino no pueden ser el mismo', path: ['destinationItemId'] }
);

// Acepta 'YYYY-MM-DD' o ISO completo — normaliza a inicio/fin del día
const flexDate = (endOfDay = false) =>
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Fecha inválida, usar YYYY-MM-DD o ISO 8601')
    .transform(v => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return endOfDay ? `${v}T23:59:59.999Z` : `${v}T00:00:00.000Z`;
      }
      return v;
    });

export const MovementQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  itemId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  movementType: z.enum(['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT']).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  supplierId: z.string().uuid().optional(),
  dateFrom: flexDate(false).optional(),
  dateTo:   flexDate(true).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}).refine(
  (d) => {
    if (d.dateFrom && d.dateTo) {
      return new Date(d.dateFrom) <= new Date(d.dateTo);
    }
    return true;
  },
  { message: 'dateFrom debe ser anterior o igual a dateTo', path: ['dateFrom'] }
);

export const ReportQuerySchema = z.object({
  dateFrom: flexDate(false),
  dateTo:   flexDate(true),
  sectionId: z.string().uuid().optional(),
  movementType: z.enum(['ENTRY', 'EXIT', 'TRANSFER', 'ADJUSTMENT']).optional(),
}).refine(
  (d) => new Date(d.dateFrom) <= new Date(d.dateTo),
  { message: 'dateFrom debe ser anterior o igual a dateTo', path: ['dateFrom'] }
);

export type CreateMovementInput = z.infer<typeof CreateMovementSchema>;
export type MovementQuery = z.infer<typeof MovementQuerySchema>;
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
