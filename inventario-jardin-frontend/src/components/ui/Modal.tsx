// =============================================================================
// src/components/ui/Modal.tsx
// Modal reutilizable con overlay, animación y cierre por Esc / click fuera
// =============================================================================
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: number
  footer?: ReactNode
}

export default function Modal({ open, onClose, title, subtitle, children, width = 520, footer }: ModalProps) {
  const overlayRef    = useRef<HTMLDivElement>(null)
  const mouseDownOnOverlay = useRef(false)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .modal-overlay { animation: overlayIn 0.18s ease forwards; }
        .modal-box     { animation: modalIn  0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Overlay — solo cierra si el mousedown Y el click ocurrieron sobre el overlay */}
      <div
        ref={overlayRef}
        className="modal-overlay"
        onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === overlayRef.current }}
        onClick={(e) => { if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(13,27,42,0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Box */}
        <div
          className="modal-box"
          style={{
            width: '100%', maxWidth: width,
            background: '#fff',
            borderRadius: '18px',
            border: '1px solid #dde1e7',
            boxShadow: '0 24px 64px rgba(13,27,42,0.18), 0 8px 24px rgba(13,27,42,0.1)',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 48px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '22px 24px 18px',
            borderBottom: '1px solid #dde1e7',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{
                fontFamily: 'Fraunces, serif', fontSize: '20px', fontWeight: 700,
                color: '#0D1B2A', margin: 0, letterSpacing: '-0.02em',
              }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: '13px', color: '#778DA9', margin: '4px 0 0 0' }}>{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                border: '1px solid #dde1e7', background: '#f5f6f8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', color: '#778DA9', transition: 'all 0.15s',
                fontFamily: 'monospace',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#edf1f6'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#778DA9' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f6f8'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#dde1e7' }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #dde1e7',
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
              flexShrink: 0, background: '#fafbfc',
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
