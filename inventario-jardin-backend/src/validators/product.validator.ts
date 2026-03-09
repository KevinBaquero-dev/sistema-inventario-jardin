// =============================================================================
// src/validators/product.validator.ts
// =============================================================================
import { z } from 'zod';

// Schema base para un campo dinámico de un producto
const FieldValueSchema = z.object({
  fieldId: z.string().uuid('fieldId debe ser UUID'),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export const CreateProductSchema = z.object({
  sectionId: z.string().uuid('sectionId inválido'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(200).trim(),
  code: z.string().max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  unit: z.string().max(50).trim().optional().default('unidad'),
  location: z.string().max(200).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
  quantityMinimum: z.number().min(0, 'Stock mínimo no puede ser negativo').optional().default(0),
  quantityMaximum: z.number().min(0).optional().nullable(),
  quantityInitial: z.number().min(0, 'Stock inicial no puede ser negativo').optional().default(0),
  fieldValues: z.array(FieldValueSchema).optional().default([]),
}).refine(
  (d) => !d.quantityMaximum || d.quantityMaximum >= d.quantityMinimum,
  { message: 'Stock máximo debe ser >= stock mínimo', path: ['quantityMaximum'] }
);

export const UpdateProductSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  code: z.string().max(100).trim().optional().nullable(),
  description: z.string().max(1000).trim().optional().nullable(),
  unit: z.string().max(50).trim().optional(),
  location: z.string().max(200).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  quantityMinimum: z.number().min(0).optional(),
  quantityMaximum: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  fieldValues: z.array(FieldValueSchema).optional(),
}).refine(
  (d) => {
    if (d.quantityMaximum !== undefined && d.quantityMaximum !== null &&
        d.quantityMinimum !== undefined) {
      return d.quantityMaximum >= d.quantityMinimum;
    }
    return true;
  },
  { message: 'Stock máximo debe ser >= stock mínimo', path: ['quantityMaximum'] }
);

export const ProductQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  sectionId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  unit: z.string().optional(),
  sortBy: z.enum(['name', 'code', 'quantityCurrent', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductQuery = z.infer<typeof ProductQuerySchema>;
