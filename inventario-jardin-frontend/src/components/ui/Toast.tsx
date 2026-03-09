// =============================================================================
// src/components/ui/Toast.tsx
// Sistema de notificaciones tipo toast
// =============================================================================
import { useState, createContext, useContext, useCallback } from 'react'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons: Record<ToastType, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
  }
  const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#15803d', text: '#166534' },
    error:   { bg: '#fff5f5', border: '#fca5a5', icon: '#c53030', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '#b45309', text: '#92400e' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#1d4ed8', text: '#1e40af' },
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '10px',
        maxWidth: '360px', width: '100%',
      }}>
        {toasts.map((t) => {
          const c = colors[t.type]
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: '12px', padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              boxShadow: '0 8px 24px rgba(13,27,42,0.12)',
              animation: 'toastIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: c.icon, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700,
              }}>
                {icons[t.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: c.text }}>{t.title}</div>
                {t.message && <div style={{ fontSize: '12.5px', color: c.text, opacity: 0.8, marginTop: '3px', lineHeight: 1.5 }}>{t.message}</div>}
              </div>
              <button onClick={() => remove(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: c.icon, opacity: 0.6, fontSize: '14px', padding: '2px',
                flexShrink: 0, lineHeight: 1,
              }}>✕</button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
