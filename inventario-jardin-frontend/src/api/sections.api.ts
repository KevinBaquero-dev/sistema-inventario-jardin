// =============================================================================
// src/api/sections.api.ts
// =============================================================================
import { api } from './axios'
import type { ApiResponse, Section, CustomField, SectionWithFields } from '../types'

export interface CreateSectionPayload {
  name: string
  description?: string
  color?: string
  icon?: string
  displayOrder?: number
}

export interface UpdateSectionPayload extends Partial<CreateSectionPayload> {
  isActive?: boolean
}

export interface CreateFieldPayload {
  name: string
  label: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN'
  isRequired?: boolean
  placeholder?: string
  helpText?: string
  displayOrder?: number
  dropdownOptions?: { label: string; value: string; color?: string; displayOrder?: number }[]
}

export interface UpdateFieldPayload extends Partial<Omit<CreateFieldPayload, 'fieldType'>> {
  isActive?: boolean
}

export const sectionsApi = {
  // BUG FIX: el backend usa showInactive=true, no isActive=false
  getAll: (params?: { search?: string; isActive?: boolean; showInactive?: boolean }) => {
    const query: Record<string, string> = {}
    if (params?.search)       query.search      = params.search
    if (params?.showInactive) query.showInactive = 'true'
    return api.get<ApiResponse<Section[]>>('/sections', { params: query })
  },

  getById: (id: string) =>
    api.get<ApiResponse<SectionWithFields>>(`/sections/${id}`),

  create: (data: CreateSectionPayload) =>
    api.post<ApiResponse<Section>>('/sections', data),

  update: (id: string, data: UpdateSectionPayload) =>
    api.put<ApiResponse<Section>>(`/sections/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/sections/${id}`),

  getFields: (sectionId: string) =>
    api.get<ApiResponse<CustomField[]>>(`/sections/${sectionId}/fields`),

  createField: (sectionId: string, data: CreateFieldPayload) =>
    api.post<ApiResponse<CustomField>>(`/sections/${sectionId}/fields`, data),

  updateField: (sectionId: string, fieldId: string, data: UpdateFieldPayload) =>
    api.put<ApiResponse<CustomField>>(`/sections/${sectionId}/fields/${fieldId}`, data),

  deleteField: (sectionId: string, fieldId: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/sections/${sectionId}/fields/${fieldId}`),
}
