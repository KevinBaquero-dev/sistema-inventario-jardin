import { api } from './axios'
import type { LoginResponse, ApiResponse } from '../types'

export const loginRequest = (data: { email: string; password: string }) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', data)

export const logoutRequest = (refreshToken: string) =>
  api.post('/auth/logout', { refreshToken })

export const getMeRequest = () =>
  api.get<ApiResponse<{ id: string; email: string; fullName: string; role: string }>>('/auth/me')
