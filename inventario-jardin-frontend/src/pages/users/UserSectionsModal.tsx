// =============================================================================
// src/pages/users/UserSectionsModal.tsx
// Modal para que el admin asigne secciones a un usuario
// =============================================================================
import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { usersApi } from '../../api/users.api'
import { sectionsApi } from '../../api/sections.api'
import { useToast } from '../../components/ui/Toast'
import { useAuthStore } from '../../store/auth.store'
import type { User, Section } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  user: User | null
}

export default function UserSectionsModal({ open, onClose, user }: Props) {
  const { toast } = useToast()
  const { user: currentUser, setUser } = useAuthStore()
  const [allSections,     setAllSections]     = useState<Section[]>([])
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())
  const [loadingSections, setLoadingSections] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false)

  // Cargar todas las secciones + las asignadas al usuario
  useEffect(() => {
    if (!open || !user) return
    setLoadingSections(true)

    Promise.all([
      sectionsApi.getAll({ showInactive: true }),
      usersApi.getSections(user.id),
    ]).then(([allRes, assignedRes]) => {
      setAllSections(allRes.data.data ?? [])
      const assigned = assignedRes.data.data ?? []
      setSelectedIds(new Set(assigned.map(s => s.id)))
    }).catch(() => {
      toast('error', 'Error', 'No se pudieron cargar las secciones')
    }).finally(() => setLoadingSections(false))
  }, [open, user, toast])

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!user) return
    // Advertir si se va a dejar al usuario sin ninguna sección
    if (selectedIds.size === 0 && !showConfirmEmpty) {
      setShowConfirmEmpty(true)
      return
    }
    setShowConfirmEmpty(false)
    setSaving(true)
    try {
      const updatedSections = await usersApi.setSections(user.id, Array.from(selectedIds))
      toast('success', 'Acceso actualizado', `Secciones de ${user.fullName} actualizadas`)
      // Si el usuario afectado es el usuario actual, actualizar el store
      if (currentUser && currentUser.id === user.id) {
        const sections = updatedSections.data.data ?? []
        setUser({
          ...currentUser,
          sectionAccess: sections.map(s => ({ section: s })),
        })
      }
      onClose()
    } catch {
      toast('error', 'Error', 'No se pudo actualizar el acceso')
    } finally {
      setSaving(false)
    }
  }

  const activeSections   = allSections.filter(s => s.isActive)
  const inactiveSections = allSections.filter(s => !s.isActive)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Acceso a secciones"
      subtitle={user ? `Definir qué secciones puede ver ${user.fullName}` : ''}
      width={560}
      footer={
        showConfirmEmpty ? (
          <>
            <div style={{ flex: 1, fontSize: 13, color: '#b45309', fontWeight: 600 }}>
              ⚠️ El usuario quedará sin acceso a ninguna sección. ¿Confirmar?
            </div>
            <button className="btn btn-secondary" onClick={() => setShowConfirmEmpty(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}
              style={{ background: '#b45309', borderColor: '#b45309' }}>
              Sí, quitar todo
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || loadingSections}>
              {saving ? <><span className="spinner" />Guardando...</> : 'Guardar acceso'}
            </button>
          </>
        )
      }
    >
      {loadingSections ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Info */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#edf1f6', border: '1px solid #dde1e7', fontSize: 13, color: '#415A77', lineHeight: 1.6 }}>
            <strong>ℹ️ Nota:</strong> El usuario solo verá las secciones marcadas. Si no se marca ninguna, el usuario no tendrá acceso a ninguna sección.
          </div>

          {/* Acciones rápidas */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSelectedIds(new Set(activeSections.map(s => s.id)))}>
              ✅ Seleccionar todas
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}>
              ✕ Quitar todas
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#778DA9', alignSelf: 'center' }}>
              {selectedIds.size} de {activeSections.length} seleccionadas
            </span>
          </div>

          {/* Lista de secciones activas */}
          {activeSections.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#778DA9', padding: '24px 0' }}>
              No hay secciones activas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeSections.map(s => {
                const checked = selectedIds.has(s.id)
                const color   = s.color ?? '#415A77'
                return (
                  <div
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${checked ? color : '#dde1e7'}`,
                      background: checked ? `${color}08` : '#fafbfc',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Checkbox visual */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${checked ? color : '#c8cdd6'}`,
                      background: checked ? color : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                    </div>

                    {/* Ícono sección */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: `${color}15`, border: `1.5px solid ${color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {s.icon ?? '📁'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0D1B2A' }}>{s.name}</div>
                      {s.description && (
                        <div style={{ fontSize: 12, color: '#778DA9', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.description}
                        </div>
                      )}
                    </div>

                    {/* Badge productos */}
                    <div style={{ fontSize: 12, color: checked ? color : '#9db5c8', fontWeight: 600, flexShrink: 0 }}>
                      {s._count?.items ?? 0} prods.
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Secciones inactivas (informativo) */}
          {inactiveSections.length > 0 && (
            <div style={{ borderTop: '1px dashed #e0e3e8', paddingTop: 14 }}>
              <div style={{ fontSize: 11.5, color: '#9db5c8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Secciones inactivas (no asignables)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {inactiveSections.map(s => (
                  <span key={s.id} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: '#f5f6f8', color: '#9db5c8', border: '1px solid #e0e3e8' }}>
                    {s.icon} {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
