// =============================================================================
// src/pages/sections/SectionsPage.tsx
// Gestión completa de secciones con campos personalizados
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { sectionsApi } from '../../api/sections.api'
import { useAuthStore } from '../../store/auth.store'
import { useToast } from '../../components/ui/Toast'
import SectionFormModal from './SectionFormModal'
import CustomFieldsModal from './CustomFieldsModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import type { Section } from '../../types'

/* ── Skeleton card ── */
function SkCard() {
  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton" style={{ height: '16px', width: '60%' }} />
          <div className="skeleton" style={{ height: '12px', width: '40%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: '12px', width: '80%' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="skeleton" style={{ height: '32px', flex: 1, borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '32px', flex: 1, borderRadius: '8px' }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function SectionsPage() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const { toast } = useToast()
  const canWrite  = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const isAdmin   = user?.role === 'ADMIN'

  // No-admins no tienen acceso a la gestión de secciones — redirigir al dashboard
  if (user && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const [sections,     setSections]     = useState<Section[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modales
  const [showForm,    setShowForm]    = useState(false)
  const [editSection, setEditSection] = useState<Section | null>(null)
  const [fieldsSection, setFieldsSection] = useState<Section | null>(null)
  const [deleteSection, setDeleteSection] = useState<Section | null>(null)
  const [deleting,    setDeleting]    = useState(false)

  /* ── Carga ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await sectionsApi.getAll({ search: search || undefined })
      setSections(res.data.data ?? [])
    } catch {
      toast('error', 'Error', 'No se pudieron cargar las secciones')
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { load() }, [load])

  /* ── Handlers ── */
  function handleCreate() { setEditSection(null); setShowForm(true) }
  function handleEdit(s: Section) { setEditSection(s); setShowForm(true) }

  function handleSuccess(s: Section) {
    setSections(prev => {
      const idx = prev.findIndex(x => x.id === s.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = s; return next }
      return [...prev, s]
    })
  }

  async function handleDelete() {
    if (!deleteSection) return
    setDeleting(true)
    try {
      await sectionsApi.delete(deleteSection.id)
      setSections(prev => prev.filter(s => s.id !== deleteSection.id))
      toast('success', 'Sección eliminada', `"${deleteSection.name}" fue eliminada`)
      setDeleteSection(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar'
      toast('error', 'Error', msg)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(s: Section) {
    try {
      const res = await sectionsApi.update(s.id, { isActive: !s.isActive })
      setSections(prev => prev.map(x => x.id === s.id ? res.data.data! : x))
      toast('success', s.isActive ? 'Sección desactivada' : 'Sección activada')
    } catch {
      toast('error', 'Error', 'No se pudo actualizar el estado')
    }
  }

  /* ── Filtro local ── */
  const filtered = sections.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
    const matchActive = showInactive ? true : s.isActive
    return matchSearch && matchActive
  })

  const activeCount   = sections.filter(s => s.isActive).length
  const inactiveCount = sections.filter(s => !s.isActive).length

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <SectionFormModal
        open={showForm} onClose={() => setShowForm(false)}
        onSuccess={handleSuccess} editSection={editSection}
      />
      <CustomFieldsModal
        open={!!fieldsSection} onClose={() => setFieldsSection(null)}
        section={fieldsSection}
      />
      <ConfirmDialog
        open={!!deleteSection} onClose={() => setDeleteSection(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Eliminar sección"
        message={`¿Eliminar "${deleteSection?.name}"? Esta acción no puede deshacerse si la sección tiene productos.`}
      />

      <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Secciones</h2>
            <p className="page-subtitle">
              {activeCount} activa{activeCount !== 1 ? 's' : ''}
              {inactiveCount > 0 && ` · ${inactiveCount} inactiva${inactiveCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          {canWrite && (
            <button className="btn btn-primary" onClick={handleCreate}>
              <span style={{ fontSize: '16px' }}>+</span> Nueva sección
            </button>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#778DA9', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar sección..." style={{ paddingLeft: '36px' }} />
          </div>
          <button className="btn btn-secondary btn-sm"
            onClick={() => setShowInactive(!showInactive)}
            style={{ borderColor: showInactive ? '#415A77' : '#dde1e7', color: showInactive ? '#415A77' : '#778DA9', background: showInactive ? '#edf1f6' : '#fff' }}>
            {showInactive ? '👁 Ocultar inactivas' : '👁 Ver inactivas'}
          </button>
          {search && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>✕ Limpiar</button>
          )}
        </div>

        {/* Grid de tarjetas */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[1,2,3,4,5,6].map(i => <SkCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-title">
                {search ? 'Sin resultados' : 'Sin secciones'}
              </div>
              <div className="empty-state-text">
                {search
                  ? `No se encontraron secciones para "${search}"`
                  : 'Crea la primera sección del jardín para organizar el inventario'}
              </div>
              {canWrite && !search && (
                <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: '20px' }}>
                  + Nueva sección
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map((s, i) => (
              <SectionCard
                key={s.id}
                section={s}
                delay={i * 0.04}
                canWrite={canWrite}
                isAdmin={isAdmin}
                onNavigate={() => navigate(`/sections/${s.id}/products`)}
                onEdit={() => handleEdit(s)}
                onFields={() => setFieldsSection(s)}
                onToggle={() => toggleActive(s)}
                onDelete={() => setDeleteSection(s)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Section Card ── */
interface SectionCardProps {
  section: Section
  delay: number
  canWrite: boolean
  isAdmin: boolean
  onNavigate: () => void
  onEdit: () => void
  onFields: () => void
  onToggle: () => void
  onDelete: () => void
}

function SectionCard({ section: s, delay, canWrite, isAdmin, onNavigate, onEdit, onFields, onToggle, onDelete }: SectionCardProps) {
  const color = s.color ?? '#415A77'

  return (
    <div
      className="card anim-fade-up"
      style={{
        animationDelay: `${delay}s`,
        padding: '0',
        opacity: s.isActive ? 1 : 0.6,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Cuerpo clicable ── */}
      <div
        style={{ padding: '18px 18px 14px', cursor: 'pointer', flex: 1 }}
        onClick={onNavigate}
      >
        {/* Ícono + nombre */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', marginBottom: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
            background: `${color}18`, border: `2px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            transition: 'transform 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'}>
            {s.icon ?? '📁'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '16px', fontWeight: 700, color: '#0D1B2A', margin: 0, letterSpacing: '-0.01em' }}>
                {s.name}
              </h3>
              {!s.isActive && (
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: '#f5f6f8', color: '#778DA9', fontWeight: 700, border: '1px solid #dde1e7' }}>
                  Inactiva
                </span>
              )}
            </div>
            {s.description && (
              <p style={{ fontSize: '12px', color: '#778DA9', margin: '3px 0 0', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {s.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderRadius: '9px', background: '#f5f6f8' }}>
          <div style={{ textAlign: 'center', minWidth: 36 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '20px', fontWeight: 700, color: '#0D1B2A', lineHeight: 1 }}>
              {s._count?.items ?? 0}
            </div>
            <div style={{ fontSize: '10px', color: '#778DA9', marginTop: '2px' }}>productos</div>
          </div>
          <div style={{ width: '1px', height: '28px', background: '#dde1e7' }} />
          <div style={{ fontSize: '11.5px', color: '#778DA9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: color, marginRight: '5px', verticalAlign: 'middle' }} />
            {s.slug}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: color, whiteSpace: 'nowrap' }}>
            Ver →
          </span>
        </div>
      </div>

      {/* ── Barra de acciones ── */}
      {canWrite && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '10px 14px',
          borderTop: '1px solid #f0f2f5',
          background: '#fafbfc',
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onFields() }}
            title="Campos personalizados"
            style={{ fontSize: '12px', color: '#415A77', gap: 5 }}
          >
            ⚙️ Campos
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onEdit() }}
            title="Editar"
            style={{ fontSize: '12px', color: '#415A77' }}
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); onToggle() }}
            title={s.isActive ? 'Desactivar' : 'Activar'}
            style={{ fontSize: '12px', color: s.isActive ? '#b45309' : '#15803d' }}
          >
            {s.isActive ? '⏸' : '▶'}
          </button>
          <div style={{ flex: 1 }} />
          {isAdmin && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Eliminar sección"
              style={{ fontSize: '12px', color: '#c53030' }}
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  )
}
