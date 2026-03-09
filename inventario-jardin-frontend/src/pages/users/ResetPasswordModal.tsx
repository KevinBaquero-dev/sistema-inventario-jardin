// =============================================================================
// src/pages/users/ResetPasswordModal.tsx
// =============================================================================
import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import { usersApi } from '../../api/users.api'
import { useToast } from '../../components/ui/Toast'
import type { User } from '../../types'

interface ResetPasswordModalProps {
  open: boolean
  onClose: () => void
  user: User | null
}

export default function ResetPasswordModal({ open, onClose, user }: ResetPasswordModalProps) {
  const { toast } = useToast()
  const [loading,  setLoading]  = useState(false)
  const [tempPass, setTempPass] = useState<string | null>(null)

  async function handleReset() {
    if (!user) return
    setLoading(true)
    try {
      const res = await usersApi.resetPassword(user.id)
      setTempPass(res.data.data?.temporaryPassword ?? null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al resetear contraseña'
      toast('error', 'Error', msg)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setTempPass(null)
    onClose()
  }

  if (tempPass) {
    return (
      <Modal open={open} onClose={handleClose} title="Contraseña reseteada" width={420}
        footer={<button className="btn btn-primary" onClick={handleClose}>Entendido</button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '22px' }}>🔑</span>
            <p style={{ fontSize: '13.5px', color: '#166534', lineHeight: 1.6, margin: 0 }}>
              La contraseña fue reseteada. Comparte estas credenciales con <strong>{user?.fullName}</strong>.
            </p>
          </div>
          <div style={{ padding: '18px', borderRadius: '12px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#778DA9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Nueva contraseña temporal</div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, color: '#415A77', letterSpacing: '0.08em' }}>{tempPass}</div>
          </div>
          <p style={{ fontSize: '12.5px', color: '#778DA9', lineHeight: 1.6 }}>
            El usuario deberá cambiar su contraseña al iniciar sesión.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Resetear contraseña" width={420}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>Cancelar</button>
          <button className="btn" onClick={handleReset} disabled={loading}
            style={{ background: '#b45309', color: '#fff', boxShadow: '0 2px 6px rgba(180,83,9,0.3)' }}>
            {loading ? <><span className="spinner" /> Reseteando...</> : '🔑 Resetear contraseña'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a' }}>
        <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontSize: '14px', color: '#92400e', lineHeight: 1.65, margin: 0 }}>
            Se generará una <strong>contraseña temporal</strong> para{' '}
            <strong>{user?.fullName}</strong>. La contraseña actual quedará invalidada.
          </p>
        </div>
      </div>
    </Modal>
  )
}
