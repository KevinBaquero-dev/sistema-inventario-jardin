// =============================================================================
// src/types/index.ts
// =============================================================================

export type UserRole = 'ADMIN' | 'COORDINATOR' | 'ASSISTANT'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface SectionAccess {
  section: {
    id: string
    name: string
    icon?: string
    color?: string
    isActive: boolean
  }
}

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  status: UserStatus
  phone?: string
  avatarUrl?: string
  mustChangePassword: boolean
  lastLoginAt?: string
  createdAt: string
  sectionAccess?: SectionAccess[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface ApiResponse<T = undefined> {
  success: boolean
  message: string
  data?: T
  error?: string
  meta?: PaginationMeta
  timestamp: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface Section {
  id: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  _count?: { items: number }
}

export interface Product {
  id: string
  code?: string
  name: string
  description?: string
  unit: string
  location?: string
  isActive: boolean
  quantityMinimum: number
  quantityMaximum?: number
  quantityCurrent: number
  section: { id: string; name: string; color?: string; icon?: string }
  createdAt: string
  updatedAt: string
}

export type MovementType = 'ENTRY' | 'EXIT' | 'TRANSFER' | 'ADJUSTMENT'

export interface MovementItem {
  id: string
  name: string
  code?: string | null
  unit: string
  section: { id: string; name: string; color?: string | null }
  fieldValues?: {
    valueText?: string | null
    valueNumber?: number | null
    valueDate?: string | null
    valueBoolean?: boolean | null
    field: { label: string; fieldType: string; slug: string; displayOrder: number }
  }[]
}

export interface Movement {
  id: string
  movementType: MovementType
  status: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  unitCost?: number | null
  totalCost?: number | null
  referenceNumber?: string | null
  reason?: string | null
  notes?: string | null
  movementDate: string
  createdAt: string
  item: MovementItem
  destinationItem?: { id: string; name: string; code?: string | null; unit: string } | null
  supplier?: { id: string; name: string } | null
  createdBy: { id: string; fullName: string }
  confirmedBy?: { id: string; fullName: string } | null
}

export interface StockSummary {
  total: number
  active: number
  lowStock: number
  outOfStock: number
}

export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN'

export interface DropdownOption {
  id: string
  label: string
  value: string
  color?: string
  displayOrder: number
}

export interface CustomField {
  id: string
  sectionId: string
  name: string
  label: string        // alias de name usado en algunos endpoints
  slug: string
  fieldType: FieldType
  isRequired: boolean
  isActive: boolean
  displayOrder: number
  placeholder?: string
  helpText?: string
  dropdownOptions?: DropdownOption[]
  createdAt: string
}

export interface SectionWithFields extends Section {
  customFields?: CustomField[]
}

// FieldValue tal como lo devuelve el backend:
// fieldValues[].field.fieldType, fieldValues[].field.dropdownOptions, etc.
export interface FieldValue {
  fieldId: string
  valueText?: string | null
  valueNumber?: number | null
  valueDate?: string | null
  valueBoolean?: boolean | null
  valueOptionId?: string | null
  field: {
    id: string
    name: string
    slug: string
    label: string
    fieldType: FieldType
    dropdownOptions?: DropdownOption[]
  }
}

export interface ProductFull extends Product {
  fieldValues?: FieldValue[]
  stockAlerts?: { id: string; quantityAtAlert: number; minimumQuantity: number; createdAt: string }[]
  createdBy?: { id: string; fullName: string }
}

export type StockStatus = 'OK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
