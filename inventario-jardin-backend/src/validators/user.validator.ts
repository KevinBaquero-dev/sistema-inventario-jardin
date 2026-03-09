// =============================================================================
// src/validators/user.validator.ts
// =============================================================================
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  fullName: z.string().min(3, 'Mínimo 3 caracteres').max(200).trim(),
  role: z.enum(['ADMIN', 'COORDINATOR', 'ASSISTANT']).optional().default('ASSISTANT'),
  phone: z.string().max(30).optional(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número')
    .optional(),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(3).max(200).trim().optional(),
  phone: z.string().max(30).optional().nullable(),
  role: z.enum(['ADMIN', 'COORDINATOR', 'ASSISTANT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const UserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'COORDINATOR', 'ASSISTANT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
