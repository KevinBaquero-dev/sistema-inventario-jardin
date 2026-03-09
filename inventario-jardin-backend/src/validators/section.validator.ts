// =============================================================================
// src/validators/section.validator.ts
// =============================================================================
import { z } from 'zod';

export const CreateSectionSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100).trim(),
  description: z.string().max(500).trim().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex: #RRGGBB').optional(),
  icon: z.string().max(10).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const UpdateSectionSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon: z.string().max(10).optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const CreateCustomFieldSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'BOOLEAN']),
  label: z.string().min(1).max(150).trim(),
  placeholder: z.string().max(200).trim().optional(),
  helpText: z.string().max(500).trim().optional(),
  isRequired: z.boolean().optional().default(false),
  isSearchable: z.boolean().optional().default(false),
  isVisibleList: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
  defaultValue: z.string().max(500).optional(),
  dropdownOptions: z.array(z.object({
    label: z.string().min(1).max(200).trim(),
    value: z.string().min(1).max(200).trim(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    displayOrder: z.number().int().min(0).optional().default(0),
  })).optional(),
}).refine(
  (d) => d.fieldType !== 'DROPDOWN' || (d.dropdownOptions && d.dropdownOptions.length > 0),
  { message: 'Los campos DROPDOWN requieren al menos una opción', path: ['dropdownOptions'] }
);

export const UpdateCustomFieldSchema = z.object({
  label: z.string().min(1).max(150).trim().optional(),
  placeholder: z.string().max(200).trim().optional().nullable(),
  helpText: z.string().max(500).trim().optional().nullable(),
  isRequired: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  isVisibleList: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  defaultValue: z.string().max(500).optional().nullable(),
});

export const UuidParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

export const SectionUuidParamSchema = z.object({
  sectionId: z.string().uuid('sectionId inválido'),
  fieldId: z.string().uuid('fieldId inválido').optional(),
});

export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;
export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof UpdateCustomFieldSchema>;
