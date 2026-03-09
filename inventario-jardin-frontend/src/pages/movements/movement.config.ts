// =============================================================================
// src/pages/movements/movement.config.ts
// Configuración visual compartida de tipos de movimiento
// =============================================================================
import type { MovementType } from '../../types'

export interface MovementConfig {
  label: string
  icon: string
  color: string
  bg: string
  border: string
  sign: string
  description: string
}

export const MOVEMENT_CONFIG: Record<MovementType, MovementConfig> = {
  ENTRY: {
    label: 'Entrada',
    icon: '↓',
    color: '#166534',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    sign: '+',
    description: 'Ingreso de productos al inventario',
  },
  EXIT: {
    label: 'Salida',
    icon: '↑',
    color: '#c53030',
    bg: '#fff5f5',
    border: '#fca5a5',
    sign: '−',
    description: 'Egreso o consumo de productos',
  },
  TRANSFER: {
    label: 'Transferencia',
    icon: '⇄',
    color: '#1e40af',
    bg: '#eff6ff',
    border: '#bfdbfe',
    sign: '⇄',
    description: 'Mover producto entre secciones',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    icon: '≈',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    sign: '≈',
    description: 'Corrección de stock por inventario físico',
  },
}

// Solo mostramos Entrada y Salida en la UI (Transfer y Adjustment ocultos por ahora)
export const MOVEMENT_TYPES = (['ENTRY', 'EXIT'] as MovementType[]).map(v => ({
  value: v,
  ...MOVEMENT_CONFIG[v],
}))
