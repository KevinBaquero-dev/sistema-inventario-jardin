// =============================================================================
// src/components/ui/ConfirmDialog.tsx
// Diálogo de confirmación — usa createPortal para renderizar sobre CUALQUIER modal
// =============================================================================
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title, message,
  confirmLabel = 'Confirmar',
  type = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  // Bloquear scroll y cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const colors = {
    danger:  { icon: '🗑️', btn: '#c53030', bg: '#fff5f5', border: '#fca5a5' },
    warning: { icon: '⚠️', btn: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    info:    { icon: 'ℹ️', btn: '#415A77', bg: '#eff4ff', border: '#bfdbfe' },
  }
  const c = colors[type]

  // zIndex 9999 — siempre por encima de cualquier modal (que usa 200)
  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,27,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'overlayIn 0.15s ease forwards',
      }}
    >
      <style>{`
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(13,27,42,0.18)',
          animation: 'confirmIn 0.18s ease forwards',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '18px', fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose} disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#778DA9', lineHeight: 1, padding: '2px' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            padding: '16px', borderRadius: '12px',
            background: c.bg, border: `1px solid ${c.border}`,
          }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{c.icon}</span>
            <p style={{ fontSize: '14px', color: '#415A77', lineHeight: 1.65, margin: 0 }}>
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{ background: c.btn, color: '#fff', boxShadow: `0 2px 6px ${c.btn}44` }}
          >
            {loading ? <><span className="spinner" /> Procesando...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
