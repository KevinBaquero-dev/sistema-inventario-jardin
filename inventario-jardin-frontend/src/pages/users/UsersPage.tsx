// =============================================================================
// src/pages/users/UsersPage.tsx
// Gestión completa de usuarios — tabla, filtros, CRUD
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { usersApi } from '../../api/users.api'
import { useAuthStore } from '../../store/auth.store'
import { useToast } from '../../components/ui/Toast'
import UserFormModal from './UserFormModal'
import ResetPasswordModal from './ResetPasswordModal'
import UserSectionsModal from './UserSectionsModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import type { User, UserRole, UserStatus } from '../../types'

/* ── Constantes ── */
const ROLE_CONFIG: Record<UserRole, { label: string; bg: string; color: string }> = {
  ADMIN:       { label: 'Administrador', bg: '#e8edf3', color: '#1B263B' },
  COORDINATOR: { label: 'Coordinadora',  bg: '#eff4ff', color: '#1d4ed8' },
  ASSISTANT:   { label: 'Asistente',     bg: '#f5f6f8', color: '#415A77' },
}

const STATUS_CONFIG: Record<UserStatus, { label: string; dot: string; color: string }> = {
  ACTIVE:    { label: 'Activo',     dot: '#22c55e', color: '#166534' },
  INACTIVE:  { label: 'Inactivo',   dot: '#778DA9', color: '#415A77' },
  SUSPENDED: { label: 'Suspendido', dot: '#c53030', color: '#c53030' },
}

/* ── Skeleton row ── */
function SkRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} style={{ padding: '16px' }}>
          <div className="skeleton" style={{ height: i === 1 ? 36 : 16, width: i === 1 ? 36 : '80%', borderRadius: i === 1 ? '50%' : 6 }} />
        </td>
      ))}
    </tr>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const currentUser = useAuthStore(s => s.user)
  const { toast } = useToast()

  // Data
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [total,   setTotal]   = useState(0)

  // Filtros
  const [search,    setSearch]    = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 10

  // Modales
  const [showForm,    setShowForm]    = useState(false)
  const [editUser,    setEditUser]    = useState<User | null>(null)
  const [resetUser,   setResetUser]   = useState<User | null>(null)
  const [deleteUser,  setDeleteUser]  = useState<User | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  /* ── Carga ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersApi.getAll({
        page, limit: LIMIT,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      setUsers(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
    } catch {
      toast('error', 'Error', 'No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter, toast])

  useEffect(() => { load() }, [load])

  // Reset página al filtrar
  useEffect(() => { setPage(1) }, [search, roleFilter, statusFilter])

  /* ── Handlers ── */
  function handleCreate() { setEditUser(null); setShowForm(true) }
  const [sectionsUser, setSectionsUser] = useState<User | null>(null)

  function handleEdit(u: User) { setEditUser(u); setShowForm(true) }

  function handleSuccess(u: User) {
    setUsers(prev => {
      const idx = prev.findIndex(x => x.id === u.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = u; return next }
      return [u, ...prev]
    })
    setTotal(prev => prev + (editUser ? 0 : 1))
  }

  async function handleDelete() {
    if (!deleteUser) return
    setDeleting(true)
    try {
      await usersApi.delete(deleteUser.id)
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
      setTotal(prev => prev - 1)
      toast('success', 'Usuario eliminado', `${deleteUser.fullName} fue eliminado`)
      setDeleteUser(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar'
      toast('error', 'Error', msg)
    } finally {
      setDeleting(false)
    }
  }

  /* ── Initials ── */
  function initials(name: string) {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  const totalPages = Math.ceil(total / LIMIT)

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <UserSectionsModal
        open={!!sectionsUser}
        onClose={() => setSectionsUser(null)}
        user={sectionsUser}
      />
      <UserFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleSuccess}
        editUser={editUser}
      />
      <ResetPasswordModal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        user={resetUser}
      />
      <ConfirmDialog
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`¿Estás segura/o de que deseas eliminar a "${deleteUser?.fullName}"? Esta acción desactivará su acceso al sistema.`}
        confirmLabel="Eliminar usuario"
        loading={deleting}
      />

      <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Header ── */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Usuarios</h2>
            <p className="page-subtitle">{total} cuenta{total !== 1 ? 's' : ''} registrada{total !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Nuevo usuario
          </button>
        </div>

        {/* ── Filtros ── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#778DA9', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              style={{ paddingLeft: '36px' }}
            />
          </div>
          {/* Rol */}
          <select className="input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', cursor: 'pointer' }}>
            <option value="">Todos los roles</option>
            <option value="ADMIN">Administrador</option>
            <option value="COORDINATOR">Coordinadora</option>
            <option value="ASSISTANT">Asistente</option>
          </select>
          {/* Estado */}
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', cursor: 'pointer' }}>
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
          {/* Limpiar */}
          {(search || roleFilter || statusFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* ── Tabla ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '280px' }}>Usuario</th>
                  <th>Rol</th>
                  <th>Secciones</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map(i => <SkRow key={i} />)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">Sin usuarios</div>
                        <div className="empty-state-text">
                          {search || roleFilter || statusFilter
                            ? 'No se encontraron usuarios con esos filtros'
                            : 'Crea el primer usuario del sistema'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => {
                    const role   = ROLE_CONFIG[u.role]
                    const status = STATUS_CONFIG[u.status]
                    const isMe   = u.id === currentUser?.id

                    return (
                      <tr key={u.id}>
                        {/* Avatar + nombre */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg,#415A77,#778DA9)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: 700, color: '#fff',
                            }}>
                              {initials(u.fullName)}
                            </div>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {u.fullName}
                                {isMe && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: '#edf1f6', color: '#415A77', fontWeight: 700 }}>Tú</span>}
                              </div>
                              <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>{u.email}</div>
                              {u.phone && <div style={{ fontSize: '11.5px', color: '#9db5c8', marginTop: '1px' }}>{u.phone}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Rol */}
                        <td>
                          <span className="badge" style={{ background: role.bg, color: role.color }}>
                            {role.label}
                          </span>
                        </td>

                        {/* Secciones asignadas */}
                        <td>
                          {u.role === 'ADMIN' ? (
                            <span style={{ fontSize: '11.5px', color: '#778DA9', fontStyle: 'italic' }}>Todas</span>
                          ) : u.sectionAccess && u.sectionAccess.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                              {u.sectionAccess.slice(0, 3).map(a => (
                                <span key={a.section.id} title={a.section.name} style={{
                                  fontSize: 11, padding: '2px 7px', borderRadius: 999,
                                  background: `${a.section.color ?? '#415A77'}15`,
                                  color: a.section.color ?? '#415A77',
                                  border: `1px solid ${a.section.color ?? '#415A77'}30`,
                                  fontWeight: 600, whiteSpace: 'nowrap',
                                }}>
                                  {a.section.icon} {a.section.name.length > 10 ? a.section.name.slice(0,10)+'…' : a.section.name}
                                </span>
                              ))}
                              {u.sectionAccess.length > 3 && (
                                <span style={{ fontSize: 11, color: '#9db5c8', padding: '2px 5px' }}>
                                  +{u.sectionAccess.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#c53030', fontStyle: 'italic' }}>Sin acceso</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.dot, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', fontWeight: 500, color: status.color }}>{status.label}</span>
                          </div>
                        </td>

                        {/* Último acceso */}
                        <td style={{ fontSize: '12.5px', color: '#778DA9' }}>
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : <span style={{ color: '#c8cdd6', fontStyle: 'italic' }}>Nunca</span>}
                        </td>

                        {/* Acciones */}
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(u)} title="Editar">
                              ✏️
                            </button>
                            {u.role !== 'ADMIN' && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setSectionsUser(u)} title="Gestionar acceso a secciones"
                                style={{ color: '#415A77' }}>
                                ◫
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => setResetUser(u)} title="Resetear contraseña">
                              🔑
                            </button>
                            {!isMe && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteUser(u)} title="Eliminar"
                                style={{ color: '#c53030' }}>
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{
              padding: '14px 20px', borderTop: '1px solid #dde1e7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fafbfc',
            }}>
              <span style={{ fontSize: '12.5px', color: '#778DA9' }}>
                Mostrando {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} de {total}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: '34px', height: '34px', borderRadius: '8px', border: '1.5px solid',
                      borderColor: p === page ? '#415A77' : '#dde1e7',
                      background: p === page ? '#edf1f6' : '#fff',
                      color: p === page ? '#415A77' : '#778DA9',
                      fontSize: '13px', fontWeight: p === page ? 700 : 400,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {p}
                  </button>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Siguiente →</button>
              </div>
            </div>
          )}
        </div>

        {/* Stats rápidas */}
        {!loading && users.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {Object.entries(ROLE_CONFIG).map(([r, cfg]) => {
              const count = users.filter(u => u.role === r).length
              return count > 0 ? (
                <div key={r} style={{ padding: '8px 14px', borderRadius: '999px', background: cfg.bg, border: `1px solid ${cfg.color}20` }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: cfg.color }}>{cfg.label}: {count}</span>
                </div>
              ) : null
            })}
          </div>
        )}
      </div>
    </>
  )
}
