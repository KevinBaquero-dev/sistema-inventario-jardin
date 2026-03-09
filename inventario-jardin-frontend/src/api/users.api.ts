// =============================================================================
// src/api/users.api.ts
// =============================================================================
import { api } from './axios'
import type { ApiResponse, User, PaginationMeta } from '../types'

export interface UsersResponse {
  data: User[]
  meta: PaginationMeta
}

export interface CreateUserPayload {
  email: string
  fullName: string
  role: 'ADMIN' | 'COORDINATOR' | 'ASSISTANT'
  phone?: string
  password?: string
}

export interface UpdateUserPayload {
  fullName?: string
  phone?: string | null
  role?: 'ADMIN' | 'COORDINATOR' | 'ASSISTANT'
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
}

export interface UsersQuery {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
}

export const usersApi = {
  getAll: (params?: UsersQuery) =>
    api.get<ApiResponse<User[]>>('/users', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  create: (data: CreateUserPayload) =>
    api.post<ApiResponse<User & { temporaryPassword?: string }>>('/users', data),

  update: (id: string, data: UpdateUserPayload) =>
    api.put<ApiResponse<User>>(`/users/${id}`, data),

  resetPassword: (id: string, password?: string) =>
    api.post<ApiResponse<{ temporaryPassword: string }>>(`/users/${id}/reset-password`, { password }),

  delete: (id: string) =>
    api.delete<ApiResponse<{ id: string; email: string }>>(`/users/${id}`),

  getSections: (id: string) =>
    api.get<ApiResponse<{ id: string; name: string; icon?: string; color?: string; isActive: boolean }[]>>(`/users/${id}/sections`),

  setSections: (id: string, sectionIds: string[]) =>
    api.put<ApiResponse<{ id: string; name: string; icon?: string; color?: string; isActive: boolean }[]>>(`/users/${id}/sections`, { sectionIds }),
}
