// =============================================================================
// src/pages/products/ProductsPage.tsx
// Gestión completa de productos con filtros, tabla y CRUD
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { productsApi } from '../../api/products.api'
import { sectionsApi } from '../../api/sections.api'
import { useAuthStore } from '../../store/auth.store'
import { useToast } from '../../components/ui/Toast'
import ProductFormModal from './ProductFormModal'
import ProductDetailModal from './ProductDetailModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import type { ProductFull, Section } from '../../types'

/* ── Stock badge ── */
function StockBadge({ current, min }: { current: number; min: number }) {
  if (current === 0) return <span className="badge badge-red">Sin stock</span>
  if (current <= min) return <span className="badge badge-amber">Stock bajo</span>
  return <span className="badge badge-blue">Normal</span>
}

/* ── Stock bar ── */
function StockBar({ current, min, max }: { current: number; min: number; max?: number }) {
  const top = max ?? Math.max(min * 3, current * 1.2, 1)
  const pct = Math.min(100, (current / top) * 100)
  const color = current === 0 ? '#c53030' : current <= min ? '#b45309' : '#415A77'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#e8eaed', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '999px', background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12.5px', fontWeight: 700, color, minWidth: '28px', textAlign: 'right' }}>{current}</span>
    </div>
  )
}

/* ── Skeleton row ── */
function SkRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: 14, width: i === 1 ? '80%' : i === 4 ? '100%' : '60%' }} />
        </td>
      ))}
    </tr>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function ProductsPage() {
  const { user }  = useAuthStore()
  const { toast } = useToast()
  const canWrite  = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const isAdmin   = user?.role === 'ADMIN'

  // Data
  const [products,  setProducts]  = useState<ProductFull[]>([])
  const [sections,  setSections]  = useState<Section[]>([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)

  // Filtros
  const [search,      setSearch]      = useState('')
  const [sectionId,   setSectionId]   = useState('')
  const [onlyLow,     setOnlyLow]     = useState(false)
  const [onlyActive,  setOnlyActive]  = useState(true)
  const [page,        setPage]        = useState(1)
  const LIMIT = 12

  // Modales
  const [showForm,      setShowForm]      = useState(false)
  const [editProduct,   setEditProduct]   = useState<ProductFull | null>(null)
  const [viewProduct,   setViewProduct]   = useState<ProductFull | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<ProductFull | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  /* ── Carga ── */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productsApi.getAll({
        page, limit: LIMIT,
        search: search || undefined,
        sectionId: sectionId || undefined,
        lowStock: onlyLow || undefined,
        isActive: onlyActive ? true : undefined,
        sortBy: 'name', sortOrder: 'asc',
      })
      setProducts(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
    } catch {
      toast('error', 'Error', 'No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [page, search, sectionId, onlyLow, onlyActive, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, sectionId, onlyLow, onlyActive])

  // Secciones para filtro
  useEffect(() => {
    sectionsApi.getAll({ isActive: true }).then(res => setSections(res.data.data ?? []))
  }, [])

  /* ── Handlers ── */
  function handleCreate() { setEditProduct(null); setShowForm(true) }
  function handleEdit(p: ProductFull) {
    setViewProduct(null)
    setEditProduct(p)
    setShowForm(true)
  }

  function handleSuccess(p: ProductFull) {
    setProducts(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next }
      return [p, ...prev]
    })
    if (!editProduct) setTotal(prev => prev + 1)
  }

  async function handleDelete() {
    if (!deleteProduct) return
    setDeleting(true)
    try {
      await productsApi.delete(deleteProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deleteProduct.id))
      setTotal(prev => prev - 1)
      toast('success', 'Producto eliminado', `"${deleteProduct.name}" fue eliminado`)
      setDeleteProduct(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar'
      toast('error', 'Error', msg)
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const hasFilters = search || sectionId || onlyLow || !onlyActive

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <ProductFormModal
        open={showForm} onClose={() => setShowForm(false)}
        onSuccess={handleSuccess} editProduct={editProduct}
      />
      <ProductDetailModal
        open={!!viewProduct} onClose={() => setViewProduct(null)}
        product={viewProduct}
        onEdit={canWrite ? () => { handleEdit(viewProduct!) } : undefined}
      />
      <ConfirmDialog
        open={!!deleteProduct} onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteProduct?.name}"? El historial de movimientos se conservará, pero el producto dejará de estar disponible.`}
      />

      <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-title">Productos</h2>
            <p className="page-subtitle">{total} producto{total !== 1 ? 's' : ''} {hasFilters ? 'encontrado' + (total !== 1 ? 's' : '') : 'en el inventario'}</p>
          </div>
          {canWrite && (
            <button className="btn btn-primary" onClick={handleCreate}>
              <span style={{ fontSize: '16px' }}>+</span> Nuevo producto
            </button>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Búsqueda */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '300px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#778DA9', pointerEvents: 'none' }}>🔍</span>
            <input className="input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..." style={{ paddingLeft: '36px' }} />
          </div>

          {/* Sección */}
          <select className="input" value={sectionId} onChange={e => setSectionId(e.target.value)}
            style={{ width: 'auto', minWidth: '170px', cursor: 'pointer' }}>
            <option value="">Todas las secciones</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>

          {/* Toggles */}
          <button className="btn btn-sm"
            onClick={() => setOnlyLow(!onlyLow)}
            style={{
              border: `1.5px solid ${onlyLow ? '#b45309' : '#dde1e7'}`,
              background: onlyLow ? '#fffbeb' : '#fff',
              color: onlyLow ? '#b45309' : '#778DA9',
              fontWeight: onlyLow ? 700 : 500,
            }}>
            ⚠️ Stock bajo{onlyLow ? ' ✓' : ''}
          </button>

          <button className="btn btn-sm"
            onClick={() => setOnlyActive(!onlyActive)}
            style={{
              border: `1.5px solid ${!onlyActive ? '#415A77' : '#dde1e7'}`,
              background: !onlyActive ? '#edf1f6' : '#fff',
              color: !onlyActive ? '#415A77' : '#778DA9',
              fontWeight: !onlyActive ? 700 : 500,
            }}>
            {onlyActive ? '👁 Ver inactivos' : '👁 Ocultar inactivos ✓'}
          </button>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSectionId(''); setOnlyLow(false); setOnlyActive(true) }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Sección</th>
                  <th>Unidad</th>
                  <th style={{ minWidth: '160px' }}>Stock</th>
                  <th>Estado</th>
                  {(canWrite) && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5,6].map(i => <SkRow key={i} />)
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <div className="empty-state-title">
                          {hasFilters ? 'Sin resultados' : 'Sin productos'}
                        </div>
                        <div className="empty-state-text">
                          {hasFilters
                            ? 'Prueba cambiando los filtros de búsqueda'
                            : 'Crea el primer producto del inventario'}
                        </div>
                        {canWrite && !hasFilters && (
                          <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: '20px' }}>
                            + Nuevo producto
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(p => {
                    const sc = p.section
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setViewProduct(p)}>
                        {/* Nombre */}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A', cursor: 'pointer' }}
                              onClick={() => setViewProduct(p)}>
                              {p.name}
                            </span>
                            {p.code && <span style={{ fontSize: '11px', color: '#9db5c8', fontFamily: 'monospace' }}>{p.code}</span>}
                            {p.location && <span style={{ fontSize: '11px', color: '#778DA9' }}>📍 {p.location}</span>}
                          </div>
                        </td>

                        {/* Sección */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{
                              width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
                              background: `${sc.color ?? '#415A77'}18`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                            }}>
                              {sc.icon ?? '📁'}
                            </div>
                            <span style={{ fontSize: '13px', color: '#415A77', fontWeight: 500 }}>{sc.name}</span>
                          </div>
                        </td>

                        {/* Unidad */}
                        <td style={{ fontSize: '13px', color: '#778DA9' }}>{p.unit}</td>

                        {/* Stock */}
                        <td><StockBar current={p.quantityCurrent} min={p.quantityMinimum} max={p.quantityMaximum} /></td>

                        {/* Estado */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <StockBadge current={p.quantityCurrent} min={p.quantityMinimum} />
                            {!p.isActive && <span className="badge badge-slate" style={{ fontSize: '10.5px' }}>Inactivo</span>}
                          </div>
                        </td>

                        {/* Acciones */}
                        {canWrite && (
                          <td onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)} title="Editar">✏️</button>
                              {isAdmin && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteProduct(p)} title="Eliminar" style={{ color: '#c53030' }}>🗑️</button>
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
                Mostrando {Math.min((page-1)*LIMIT+1, total)}–{Math.min(page*LIMIT, total)} de {total}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p-1)} disabled={page === 1}>← Ant.</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i+1 : page <= 4 ? i+1 : page >= totalPages-3 ? totalPages-6+i : page-3+i
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
      </div>
    </>
  )
}
