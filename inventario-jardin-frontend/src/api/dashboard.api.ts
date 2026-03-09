import { api } from './axios'
import type { ApiResponse, Section, Movement, StockSummary } from '../types'

export const getStockSummary = () =>
  api.get<ApiResponse<StockSummary>>('/products/stock-summary')

export const getLowStock = () =>
  api.get<ApiResponse<unknown[]>>('/products/low-stock?limit=5')

export const getRecentMovements = () =>
  api.get<ApiResponse<Movement[]>>('/movements?limit=8&sortOrder=desc')

export const getSections = () =>
  api.get<ApiResponse<Section[]>>('/sections')
