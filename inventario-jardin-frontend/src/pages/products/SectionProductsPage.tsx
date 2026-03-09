// =============================================================================
// src/pages/products/SectionProductsPage.tsx
// Productos de una sección específica, con formulario que incluye sus campos personalizados
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sectionsApi } from '../../api/sections.api'
import { productsApi } from '../../api/products.api'
import { useAuthStore } from '../../store/auth.store'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ProductDetailModal from './ProductDetailModal'
import SectionProductForm from './SectionProductForm'
import SectionFormModal from '../sections/SectionFormModal'
import SectionMovementsTab from './SectionMovementsTab'
import CustomFieldsModal from '../sections/CustomFieldsModal'
import type { Section, CustomField, ProductFull } from '../../types'

/* ── Formatear valor de campo personalizado ── */
function formatFieldValue(field: CustomField, product: ProductFull): string {
  const fv = product.fieldValues?.find(v => v.fieldId === field.id)
  if (!fv) return '—'
  switch (field.fieldType) {
    case 'BOOLEAN':
      return fv.valueBoolean === true ? 'Sí' : fv.valueBoolean === false ? 'No' : '—'
    case 'NUMBER':
      return fv.valueNumber != null ? String(fv.valueNumber) : '—'
    case 'DATE':
      return fv.valueDate ? new Date(fv.valueDate).toLocaleDateString('es-CL') : '—'
    case 'DROPDOWN':
      return fv.field?.dropdownOptions?.find(o => o.id === fv.valueOptionId)?.label ?? '—'
    default:
      return fv.valueText || '—'
  }
}

/* ── Stock bar ── */
function StockBar({ current, min, max }: { current: number; min: number; max?: number }) {
  const top   = max ?? Math.max(min * 3, current * 1.2, 1)
  const pct   = Math.min(100, (current / top) * 100)
  const color = current === 0 ? '#c53030' : current <= min ? '#b45309' : '#415A77'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#e8eaed', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>{current}</span>
    </div>
  )
}

/* ── Skeleton row ── */
function SkRow({ extraCols = 0 }: { extraCols?: number }) {
  return (
    <tr>
      {[1, 2, ...Array(extraCols).fill(0).map((_, i) => i + 3), 10, 11].map((i, idx) => (
        <td key={idx} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: 14, width: i === 1 ? '75%' : '55%' }} />
        </td>
      ))}
    </tr>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function SectionProductsPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const { toast }     = useToast()
  const canWrite      = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const isAdmin       = user?.role === 'ADMIN'

  // Sección + campos
  const [section,      setSection]      = useState<Section | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loadingMeta,  setLoadingMeta]  = useState(true)

  // Productos
  const [products,  setProducts]  = useState<ProductFull[]>([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const LIMIT = 12

  // Formulario / detalle
  const [showForm,      setShowForm]      = useState(false)
  const [editProduct,   setEditProduct]   = useState<ProductFull | null>(null)
  const [viewProduct,   setViewProduct]   = useState<ProductFull | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<ProductFull | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  // Tab activo + filtros de movimientos (preservados al cambiar tab)
  const [activeTab,     setActiveTab]     = useState<'products' | 'movements'>('products')
  const [movTypeFilter, setMovTypeFilter] = useState<import('../../types').MovementType | ''>('')
  const [movDateFrom,   setMovDateFrom]   = useState('')
  const [movDateTo,     setMovDateTo]     = useState('')
  const [movPage,       setMovPage]       = useState(1)

  // Modales de sección (editar, campos, toggle)
  const [showEditSection,  setShowEditSection]  = useState(false)
  const [showFields,       setShowFields]       = useState(false)
  const [togglingSection,  setTogglingSection]  = useState(false)

  /* ── Cargar sección + campos ── */
  useEffect(() => {
    if (!sectionId) return
    setLoadingMeta(true)
    Promise.all([
      sectionsApi.getById(sectionId),
      sectionsApi.getFields(sectionId),
    ]).then(([secRes, fieldsRes]) => {
      setSection(secRes.data.data ?? null)
      setCustomFields(fieldsRes.data.data ?? [])
    }).catch(() => {
      toast('error', 'Error', 'No se pudo cargar la sección')
      navigate('/sections')
    }).finally(() => setLoadingMeta(false))
  }, [sectionId, navigate, toast])

  /* ── Cargar productos ── */
  const load = useCallback(async () => {
    if (!sectionId) return
    setLoading(true)
    try {
      const res = await productsApi.getAll({
        sectionId, page, limit: LIMIT,
        search: search || undefined,
        sortBy: 'name', sortOrder: 'asc',
      })
      setProducts(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
    } catch {
      toast('error', 'Error', 'No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [sectionId, page, search, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  /* ── Handlers ── */
  function handleCreate() { setEditProduct(null); setShowForm(true) }

  async function handleToggleSection() {
    if (!section) return
    setTogglingSection(true)
    try {
      const res = await sectionsApi.update(section.id, { isActive: !section.isActive })
      setSection(res.data.data ?? null)
      toast('success', section.isActive ? 'Sección desactivada' : 'Sección activada')
    } catch { toast('error', 'Error', 'No se pudo actualizar el estado') }
    finally { setTogglingSection(false) }
  }

  function handleSectionUpdated(s: Section) {
    setSection(s)
  }
  function handleEdit(p: ProductFull) { setViewProduct(null); setEditProduct(p); setShowForm(true) }

  function handleSuccess(p: ProductFull) {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next }
      return [p, ...prev]
    })
    if (!editProduct) setTotal(t => t + 1)
    setShowForm(false)
    setEditProduct(null)
  }

  async function handleDelete() {
    if (!deleteProduct) return
    setDeleting(true)
    try {
      await productsApi.delete(deleteProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deleteProduct.id))
      setTotal(t => t - 1)
      toast('success', 'Producto eliminado', `"${deleteProduct.name}" fue eliminado`)
      setDeleteProduct(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar'
      toast('error', 'Error', msg)
    } finally {
      setDeleting(false)
    }
  }

  const totalPages  = Math.ceil(total / LIMIT)
  const sectionColor = section?.color ?? '#415A77'

  /* ══════════════════════════════════════════════════════════════════ */

  // ── Layout con formulario lateral ──
  if (showForm) {
    return (
      <div className="anim-fade-up">
        <SectionProductForm
          section={section!}
          customFields={customFields}
          editProduct={editProduct}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditProduct(null) }}
        />
      </div>
    )
  }

  return (
    <>
      <ProductDetailModal
        open={!!viewProduct} onClose={() => setViewProduct(null)}
        product={viewProduct}
        onEdit={canWrite ? () => handleEdit(viewProduct!) : undefined}
      />
      <ConfirmDialog
        open={!!deleteProduct} onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteProduct?.name}"? El historial de movimientos se conservará.`}
      />

      {/* Modales de gestión de la sección */}
      <SectionFormModal
        open={showEditSection} onClose={() => setShowEditSection(false)}
        onSuccess={handleSectionUpdated} editSection={section}
      />
      <CustomFieldsModal
        open={showFields} onClose={() => { setShowFields(false); /* recargar campos */ sectionsApi.getFields(sectionId!).then(r => setCustomFields(r.data.data ?? [])).catch(() => {}) }}
        section={section}
      />

      <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 140px)' }}>

        {/* ── Breadcrumb + header ── */}
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => navigate('/sections')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#778DA9', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#415A77'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#778DA9'}>
              ◫ Secciones
            </button>
            <span style={{ color: '#c8cdd6', fontSize: '13px' }}>›</span>
            {loadingMeta ? (
              <div className="skeleton" style={{ height: 14, width: 80 }} />
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0D1B2A' }}>
                {section?.icon} {section?.name}
              </span>
            )}
          </div>

          {/* Header */}
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {loadingMeta ? (
                <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 13 }} />
              ) : (
                <div style={{
                  width: '52px', height: '52px', borderRadius: '13px', flexShrink: 0,
                  background: `${sectionColor}18`, border: `2px solid ${sectionColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                }}>
                  {section?.icon ?? '📁'}
                </div>
              )}
              <div>
                <h2 className="page-title" style={{ marginBottom: '2px' }}>
                  {loadingMeta ? <span className="skeleton" style={{ display:'inline-block', width:120, height:20 }} /> : section?.name}
                </h2>
                <p className="page-subtitle">
                  {total} producto{total !== 1 ? 's' : ''}
                  {section?.description ? ` · ${section.description}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {canWrite && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowFields(true)} title="Gestionar campos personalizados">
                    ⚙️ Campos
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowEditSection(true)} title="Editar sección">
                    ✏️ Editar
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleToggleSection}
                    disabled={togglingSection}
                    title={section?.isActive ? 'Desactivar sección' : 'Activar sección'}
                    style={{ color: section?.isActive ? '#b45309' : '#15803d' }}
                  >
                    {section?.isActive ? '⏸ Desactivar' : '▶ Activar'}
                  </button>
                </>
              )}
              {canWrite && (
                <button className="btn btn-primary" onClick={handleCreate}>
                  <span style={{ fontSize: '16px' }}>+</span> Nuevo producto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #f0f2f5' }}>
          {([
            { key: 'products',  label: '📦 Inventario',  desc: `${total} productos` },
            { key: 'movements', label: '📋 Movimientos', desc: 'Entradas y salidas' },
          ] as const).map(tab => {
            const active = activeTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `3px solid ${active ? sectionColor : 'transparent'}`,
                  marginBottom: -2,
                  color: active ? sectionColor : '#778DA9',
                  fontWeight: active ? 700 : 500,
                  fontSize: 13.5,
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Inventario ── */}
        {activeTab === 'products' && (<>

        {/* Campos personalizados de esta sección */}
        {!loadingMeta && customFields.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campos:</span>
            {customFields.map(f => (
              <span key={f.id} style={{
                padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
                background: `${sectionColor}10`, border: `1px solid ${sectionColor}25`, color: sectionColor,
              }}>
                {f.name}{f.isRequired ? ' *' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Filtro búsqueda */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '320px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#778DA9', pointerEvents: 'none' }}>🔍</span>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..." style={{ paddingLeft: '36px' }} />
          </div>
          {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>✕ Limpiar</button>}
        </div>

        {/* Tabla */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidad</th>
                  {customFields.slice(0, 3).map(f => (
                    <th key={f.id} style={{ minWidth: '110px' }}>{f.label || f.name}</th>
                  ))}
                  <th style={{ minWidth: '160px' }}>Stock</th>
                  <th>Estado</th>
                  {canWrite && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => <SkRow key={i} extraCols={Math.min(customFields.length, 3)} />)
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={(canWrite ? 5 : 4) + Math.min(customFields.length, 3)}>
                      <div className="empty-state">
                        <div className="empty-state-icon">{section?.icon ?? '📦'}</div>
                        <div className="empty-state-title">
                          {search ? 'Sin resultados' : `Sin productos en ${section?.name}`}
                        </div>
                        <div className="empty-state-text">
                          {search ? 'Prueba con otro término' : 'Agrega el primer producto de esta sección'}
                        </div>
                        {canWrite && !search && (
                          <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: '20px' }}>
                            + Nuevo producto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(p => {
                    const stockColor = p.quantityCurrent === 0 ? '#c53030' : p.quantityCurrent <= p.quantityMinimum ? '#b45309' : '#166534'
                    const stockLabel = p.quantityCurrent === 0 ? 'Sin stock' : p.quantityCurrent <= p.quantityMinimum ? 'Stock bajo' : 'Normal'
                    const stockBg    = p.quantityCurrent === 0 ? '#fee2e2' : p.quantityCurrent <= p.quantityMinimum ? '#fef3c7' : '#dcfce7'

                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setViewProduct(p)}>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A', cursor: 'pointer' }}
                              onClick={() => setViewProduct(p)}>
                              {p.name}
                            </span>
                            {p.code && <span style={{ fontSize: '11px', color: '#9db5c8', fontFamily: 'monospace' }}>{p.code}</span>}
                            {p.location && <span style={{ fontSize: '11px', color: '#778DA9' }}>📍 {p.location}</span>}
                            {!p.isActive && <span style={{ fontSize: '10px', color: '#778DA9', fontStyle: 'italic' }}>Inactivo</span>}
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: '#778DA9' }}>{p.unit}</td>
                        {customFields.slice(0, 3).map(f => (
                          <td key={f.id} style={{ fontSize: '13px', color: '#415A77', maxWidth: '140px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {formatFieldValue(f, p)}
                            </span>
                          </td>
                        ))}
                        <td><StockBar current={p.quantityCurrent} min={p.quantityMinimum} max={p.quantityMaximum} /></td>
                        <td>
                          <span className="badge" style={{ background: stockBg, color: stockColor }}>
                            {stockLabel}
                          </span>
                        </td>
                        {canWrite && (
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}>✏️</button>
                              {isAdmin && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteProduct(p)} style={{ color: '#c53030' }}>🗑️</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid #dde1e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
              <span style={{ fontSize: '12.5px', color: '#778DA9' }}>
                {Math.min((page-1)*LIMIT+1, total)}–{Math.min(page*LIMIT, total)} de {total}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p-1)} disabled={page === 1}>← Ant.</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: '32px', height: '32px', borderRadius: '7px', border: '1.5px solid', borderColor: p === page ? '#415A77' : '#dde1e7', background: p === page ? '#edf1f6' : '#fff', color: p === page ? '#415A77' : '#778DA9', fontSize: '13px', fontWeight: p === page ? 700 : 400, cursor: 'pointer' }}>
                      {p}
                    </button>
                  )
                })}
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p+1)} disabled={page === totalPages}>Sig. →</button>
              </div>
            </div>
          )}
        </div>
        </>)}

        {/* ── Tab: Movimientos ── */}
        {activeTab === 'movements' && section && (
          <SectionMovementsTab
            section={section}
            sectionColor={sectionColor}
            typeFilter={movTypeFilter}
            dateFrom={movDateFrom}
            dateTo={movDateTo}
            page={movPage}
            onTypeFilter={v => { setMovTypeFilter(v); setMovPage(1) }}
            onDateFrom={v  => { setMovDateFrom(v);   setMovPage(1) }}
            onDateTo={v    => { setMovDateTo(v);     setMovPage(1) }}
            onPage={setMovPage}
          />
        )}

      </div>
    </>
  )
}
