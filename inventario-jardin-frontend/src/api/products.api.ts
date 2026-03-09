// =============================================================================
// src/api/products.api.ts
// =============================================================================
import { api } from './axios'
import type { ApiResponse, ProductFull, StockSummary } from '../types'

export interface ProductsQuery {
  page?: number
  limit?: number
  search?: string
  sectionId?: string
  isActive?: boolean
  lowStock?: boolean
  unit?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// BUG FIX: el backend espera { fieldId, value } genérico.
// El service distribuye "value" al campo correcto según fieldType.
export interface FieldValuePayload {
  fieldId: string
  value: string | number | boolean | null | undefined
}

export interface CreateProductPayload {
  name: string
  code?: string
  description?: string
  sectionId: string
  unit: string
  location?: string
  quantityMinimum: number
  quantityMaximum?: number
  quantityInitial?: number
  fieldValues?: FieldValuePayload[]
}

export interface UpdateProductPayload extends Partial<Omit<CreateProductPayload, 'sectionId' | 'quantityInitial'>> {
  isActive?: boolean
}

export interface LowStockItem {
  id: string
  name: string
  code?: string
  unit: string
  quantityCurrent: number
  quantityMinimum: number
  deficit: number
  stockStatus: 'LOW_STOCK' | 'OUT_OF_STOCK'
  section: { id: string; name: string; color?: string; icon?: string }
}

export const productsApi = {
  getAll: (params?: ProductsQuery) =>
    api.get<ApiResponse<ProductFull[]>>('/products', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<ProductFull>>(`/products/${id}`),

  create: (data: CreateProductPayload) =>
    api.post<ApiResponse<ProductFull>>('/products', data),

  update: (id: string, data: UpdateProductPayload) =>
    api.put<ApiResponse<ProductFull>>(`/products/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/products/${id}`),

  getLowStock: () =>
    api.get<ApiResponse<LowStockItem[]>>('/products/low-stock'),

  getStockSummary: () =>
    api.get<ApiResponse<StockSummary>>('/products/stock-summary'),
}
