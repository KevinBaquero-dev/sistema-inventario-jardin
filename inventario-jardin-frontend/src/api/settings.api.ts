// =============================================================================
// src/api/settings.api.ts
// =============================================================================
import { api } from './axios'
import type { ApiResponse } from '../types'

export interface SystemConfig {
  app_name:          string
  app_slogan:        string
  app_logo_url:      string
  primary_color:     string
  accent_color:      string
  login_title:       string
  login_subtitle:    string
  login_description: string
  login_features:    string  // JSON array serializado
  login_footer:      string
}

export interface SystemConfigMeta {
  key:       string
  value:     string
  label:     string
  group:     string
  updatedAt: string | null
  updatedBy: { id: string; fullName: string } | null
}

export interface UpdateSettingsPayload {
  app_name?:          string
  app_slogan?:        string
  app_logo_url?:      string
  primary_color?:     string
  accent_color?:      string
  login_title?:       string
  login_subtitle?:    string
  login_description?: string
  login_features?:    string
  login_footer?:      string
}

export const settingsApi = {
  get: () =>
    api.get<ApiResponse<SystemConfig>>('/settings'),

  getMeta: () =>
    api.get<ApiResponse<SystemConfigMeta[]>>('/settings/meta'),

  update: (data: UpdateSettingsPayload) =>
    api.put<ApiResponse<SystemConfig>>('/settings', data),
}
