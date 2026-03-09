// =============================================================================
// src/validators/settings.validator.ts
// =============================================================================
import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  app_name:          z.string().min(2).max(100).trim().optional(),
  app_slogan:        z.string().max(200).trim().optional(),
  app_logo_url:      z.string().url().max(500).optional().or(z.literal('')),
  primary_color:     z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido').optional(),
  accent_color:      z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido').optional(),
  login_title:       z.string().max(100).trim().optional(),
  login_subtitle:    z.string().max(100).trim().optional(),
  login_description: z.string().max(500).trim().optional(),
  login_features:    z.string().max(500).optional(), // JSON array serializado
  login_footer:      z.string().max(200).trim().optional(),
}).strict();

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
