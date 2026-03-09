// =============================================================================
// src/pages/users/UserFormModal.tsx
// Modal para crear y editar usuarios
// =============================================================================
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { usersApi, type CreateUserPayload, type UpdateUserPayload } from '../../api/users.api'
import { useToast } from '../../components/ui/Toast'
import type { User } from '../../types'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (user: User) => void
  editUser?: User | null
}

const ROLES = [
  { value: 'ADMIN',       label: 'Administrador',  desc: 'Acceso total al sistema' },
  { value: 'COORDINATOR', label: 'Coordinadora',   desc: 'Gestión de inventario y reportes' },
  { value: 'ASSISTANT',   label: 'Asistente',      desc: 'Registro de movimientos' },
] as const

export default function UserFormModal({ open, onClose, onSuccess, editUser }: UserFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!editUser

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [role,     setRole]     = useState<'ADMIN' | 'COORDINATOR' | 'ASSISTANT'>('ASSISTANT')
  const [status,   setStatus]   = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')
  const [password, setPassword] = useState('')
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [tempPass, setTempPass] = useState<string | null>(null)

  // Prellenar en edición
  useEffect(() => {
    if (editUser) {
      setFullName(editUser.fullName)
      setEmail(editUser.email)
      setPhone(editUser.phone ?? '')
      setRole(editUser.role)
      setStatus(editUser.status)
    } else {
      setFullName(''); setEmail(''); setPhone('')
      setRole('ASSISTANT'); setStatus('ACTIVE'); setPassword('')
    }
    setErrors({})
    setTempPass(null)
  }, [editUser, open])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!fullName.trim())      e.fullName = 'El nombre es requerido'
    if (!email.trim())         e.email    = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo inválido'
    if (!isEdit && password && password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (!isEdit && password && !/[A-Z]/.test(password)) e.password = 'Debe tener al menos una mayúscula'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      let result: User
      if (isEdit) {
        const payload: UpdateUserPayload = {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          role, status,
        }
        const res = await usersApi.update(editUser!.id, payload)
        result = res.data.data!
        toast('success', 'Usuario actualizado', `${result.fullName} fue actualizado correctamente`)
      } else {
        const payload: CreateUserPayload = {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          role,
          password: password || undefined,
        }
        const res = await usersApi.create(payload)
        result = res.data.data!
        const tp = (res.data.data as User & { temporaryPassword?: string }).temporaryPassword
        if (tp) setTempPass(tp)
        else { toast('success', 'Usuario creado', `${result.fullName} fue creado correctamente`); onSuccess(result); onClose() }
        return
      }
      onSuccess(result)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Ocurrió un error'
      toast('error', 'Error', msg)
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de contraseña temporal
  if (tempPass) {
    return (
      <Modal open={open} onClose={() => { setTempPass(null); onClose() }} title="Usuario creado" width={440}
        footer={<button className="btn btn-primary" onClick={() => { setTempPass(null); onClose() }}>Entendido</button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '14px' }}>Cuenta creada exitosamente</div>
              <div style={{ fontSize: '13px', color: '#15803d', marginTop: '3px' }}>Comparte estas credenciales con el usuario</div>
            </div>
          </div>
          <div style={{ padding: '18px', borderRadius: '12px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#778DA9', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Credenciales de acceso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#778DA9', marginBottom: '3px' }}>Correo</div>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#0D1B2A', fontWeight: 600 }}>{email}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#778DA9', marginBottom: '3px' }}>Contraseña temporal</div>
                <div style={{ fontFamily: 'monospace', fontSize: '18px', color: '#415A77', fontWeight: 700, letterSpacing: '0.05em' }}>{tempPass}</div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12.5px', color: '#778DA9', lineHeight: 1.6 }}>
            El usuario deberá cambiar su contraseña al iniciar sesión por primera vez.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      subtitle={isEdit ? `Editando a ${editUser?.fullName}` : 'Completa los datos para crear la cuenta'}
      width={600}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner" /> Guardando...</> : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Nombre */}
        <div className="form-group">
          <label className="label">Nombre completo *</label>
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ej: María González" autoComplete="off" />
          {errors.fullName && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.fullName}</span>}
        </div>

        {/* Email */}
        {!isEdit && (
          <div className="form-group">
            <label className="label">Correo electrónico *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@jardin.com" autoComplete="off" />
            {errors.email && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.email}</span>}
          </div>
        )}

        {/* Teléfono */}
        <div className="form-group">
          <label className="label">Teléfono <span style={{ opacity: 0.5 }}>(opcional)</span></label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56 9 1234 5678" autoComplete="off" />
        </div>

        {/* Password (solo crear) */}
        {!isEdit && (
          <div className="form-group">
            <label className="label">Contraseña <span style={{ opacity: 0.5 }}>(opcional — se generará automáticamente)</span></label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres con mayúscula" autoComplete="new-password" />
            {errors.password && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.password}</span>}
          </div>
        )}

        {/* Rol */}
        <div className="form-group">
          <label className="label">Rol *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ROLES.map(r => (
              <label key={r.value} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1.5px solid ${role === r.value ? '#415A77' : '#dde1e7'}`,
                background: role === r.value ? '#edf1f6' : '#fff',
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="role" value={r.value} checked={role === r.value}
                  onChange={() => setRole(r.value)} style={{ accentColor: '#415A77', width: '16px', height: '16px' }} />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>{r.label}</div>
                  <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>{r.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Estado (solo editar) */}
        {isEdit && (
          <div className="form-group">
            <label className="label">Estado</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map(s => {
                const labels = { ACTIVE: 'Activo', INACTIVE: 'Inactivo', SUSPENDED: 'Suspendido' }
                const active = status === s
                return (
                  <button key={s} type="button"
                    onClick={() => setStatus(s)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '9px', cursor: 'pointer',
                      border: `1.5px solid ${active ? '#415A77' : '#dde1e7'}`,
                      background: active ? '#edf1f6' : '#fff',
                      fontSize: '13px', fontWeight: active ? 700 : 500,
                      color: active ? '#415A77' : '#778DA9',
                      transition: 'all 0.15s',
                    }}>
                    {labels[s]}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
