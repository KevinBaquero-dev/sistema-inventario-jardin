// =============================================================================
// src/api/movements.api.ts
// =============================================================================
import { api } from './axios'
import type { ApiResponse, Movement } from '../types'

export interface MovementsQuery {
  page?: number
  limit?: number
  itemId?: string
  sectionId?: string
  movementType?: string
  dateFrom?: string
  dateTo?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateMovementPayload {
  itemId: string
  movementType: 'ENTRY' | 'EXIT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  destinationItemId?: string   // para TRANSFER
  reason?: string
  notes?: string
  supplierId?: string
  unitCost?: number
  movementDate?: string
}

export interface ReportSummaryEntry {
  count: number
  totalQuantity: number
  totalCost: number
}

export interface ReportSection {
  id: string
  name: string
  color?: string | null
  icon?: string | null
  customFields: { id: string; label: string; fieldType: string; slug: string; displayOrder: number }[]
}

export interface FullReport {
  movements: import('../types').Movement[]
  summary:   Record<string, ReportSummaryEntry>
  sections:  ReportSection[]
  period:    { dateFrom: string; dateTo: string }
  total:     number
}

export const movementsApi = {
  getAll: (params?: MovementsQuery) =>
    api.get<ApiResponse<Movement[]>>('/movements', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Movement>>(`/movements/${id}`),

  create: (data: CreateMovementPayload) =>
    api.post<ApiResponse<Movement>>('/movements', data),

  getItemHistory: (itemId: string) =>
    api.get<ApiResponse<Movement[]>>(`/movements/item/${itemId}/history`),

  getReport: (params?: { dateFrom?: string; dateTo?: string; sectionId?: string; movementType?: string }) =>
    api.get<ApiResponse<FullReport>>('/movements/report', { params }),

  // Descarga directa desde el backend (sin libs de exportación en el frontend)
  exportExcel: (params: { dateFrom: string; dateTo: string; sectionId?: string; movementType?: string }) => {
    const q = new URLSearchParams()
    q.set('dateFrom', params.dateFrom)
    q.set('dateTo',   params.dateTo)
    if (params.sectionId)    q.set('sectionId',    params.sectionId)
    if (params.movementType) q.set('movementType', params.movementType)
    return api.get<Blob>(`/movements/export/excel?${q.toString()}`, { responseType: 'blob' })
  },

  exportPDF: (params: { dateFrom: string; dateTo: string; sectionId?: string; movementType?: string }) => {
    const q = new URLSearchParams()
    q.set('dateFrom', params.dateFrom)
    q.set('dateTo',   params.dateTo)
    if (params.sectionId)    q.set('sectionId',    params.sectionId)
    if (params.movementType) q.set('movementType', params.movementType)
    return api.get<Blob>(`/movements/export/pdf?${q.toString()}`, { responseType: 'blob' })
  },
}
