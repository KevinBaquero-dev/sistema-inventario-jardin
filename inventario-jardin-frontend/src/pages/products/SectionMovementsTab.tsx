// =============================================================================
// src/pages/products/SectionMovementsTab.tsx
// Mini-tablero de movimientos de una sección con botones de Entrada / Salida
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { movementsApi } from '../../api/movements.api'
import NewMovementModal from '../movements/NewMovementModal'
import MovementDetailModal from '../movements/MovementDetailModal'
import { MOVEMENT_CONFIG } from '../movements/movement.config'
import type { Movement, MovementType, Section } from '../../types'

interface Props {
  section: Section
  sectionColor: string
  typeFilter: MovementType | ''
  dateFrom: string
  dateTo: string
  page: number
  onTypeFilter: (v: MovementType | '') => void
  onDateFrom: (v: string) => void
  onDateTo: (v: string) => void
  onPage: (v: number) => void
}

function SkRow() {
  return (
    <tr>
      {[70, 55, 40, 50, 45].map((w, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <div className="skeleton" style={{ height: 13, width: `${w}%` }} />
        </td>
      ))}
    </tr>
  )
}

const LIMIT = 15

export default function SectionMovementsTab({ section, sectionColor, typeFilter, dateFrom, dateTo, page, onTypeFilter, onDateFrom, onDateTo, onPage }: Props) {
  const [movements,   setMovements]   = useState<Movement[]>([])
  const [loading,     setLoading]     = useState(true)
  const [total,       setTotal]       = useState(0)

  // Modales
  const [showNew,  setShowNew]  = useState(false)
  const [newType,  setNewType]  = useState<MovementType>('ENTRY')
  const [viewMov,  setViewMov]  = useState<Movement | null>(null)

  // Stats del periodo visible
  const entries = movements.filter(m => m.movementType === 'ENTRY').reduce((s, m) => s + (m.quantityAfter - m.quantityBefore), 0)
  const exits   = movements.filter(m => m.movementType === 'EXIT').reduce((s, m)  => s + (m.quantityBefore - m.quantityAfter), 0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await movementsApi.getAll({
        sectionId: section.id,
        page, limit: LIMIT,
        movementType: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
        sortOrder: 'desc',
      })
      setMovements(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [section.id, page, typeFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  function openNew(type: MovementType) {
    setNewType(type)
    setShowNew(true)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const hasFilters = typeFilter || dateFrom || dateTo

  return (
    <>
      <NewMovementModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={load}
        defaultType={newType}
        defaultSectionId={section.id}
      />
      <MovementDetailModal
        open={!!viewMov}
        onClose={() => setViewMov(null)}
        movement={viewMov}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 'calc(100vh - 320px)' }}>

        {/* ── Acciones principales ── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Entrada */}
          <button
            onClick={() => openNew('ENTRY')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 11, cursor: 'pointer',
              border: '1.5px solid #bbf7d0', background: '#f0fdf4',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(22,101,52,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>↓</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#166534' }}>+ Entrada</div>
              <div style={{ fontSize: 11.5, color: '#166534', opacity: 0.7 }}>Ingreso de stock</div>
            </div>
          </button>

          {/* Salida */}
          <button
            onClick={() => openNew('EXIT')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px', borderRadius: 11, cursor: 'pointer',
              border: '1.5px solid #fca5a5', background: '#fff5f5',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(197,48,48,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#c53030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>↑</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#c53030' }}>− Salida</div>
              <div style={{ fontSize: 11.5, color: '#c53030', opacity: 0.7 }}>Egreso de stock</div>
            </div>
          </button>

          <div style={{ flex: 1 }} />

          {/* Mini stats del periodo */}
          {!loading && movements.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ padding: '8px 14px', borderRadius: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', fontWeight: 600 }}>
                ↓ {entries > 0 ? `+${entries}` : 0} u. entradas
              </div>
              <div style={{ padding: '8px 14px', borderRadius: 9, background: '#fff5f5', border: '1px solid #fca5a5', fontSize: 12, color: '#c53030', fontWeight: 600 }}>
                ↑ {exits > 0 ? `-${exits}` : 0} u. salidas
              </div>
            </div>
          )}
        </div>

        {/* ── Filtros ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Tipo */}
          {(['', 'ENTRY', 'EXIT'] as const).map(t => {
            const cfg = t ? MOVEMENT_CONFIG[t as MovementType] : null
            const active = typeFilter === t
            return (
              <button key={t} className="btn btn-sm"
                onClick={() => onTypeFilter(t as MovementType | '')}
                style={{
                  border: `1.5px solid ${active ? (cfg?.color ?? sectionColor) : '#dde1e7'}`,
                  background: active ? (cfg?.bg ?? '#edf1f6') : '#fff',
                  color: active ? (cfg?.color ?? sectionColor) : '#778DA9',
                  fontWeight: active ? 700 : 500,
                }}>
                {t === '' ? 'Todos' : `${cfg?.icon} ${cfg?.label}`}
              </button>
            )
          })}

          {/* Fechas */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
            <input className="input" type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)} style={{ width: 140 }} title="Desde" />
            <span style={{ color: '#9db5c8', fontSize: 12 }}>→</span>
            <input className="input" type="date" value={dateTo}   onChange={e => onDateTo(e.target.value)}   style={{ width: 140 }} title="Hasta" />
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => { onTypeFilter(''); onDateFrom(''); onDateTo('') }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Tabla ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Stock antes → después</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => <SkRow key={i} />)
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">
                        {hasFilters ? 'Sin resultados' : 'Sin movimientos en esta sección'}
                      </div>
                      <div className="empty-state-text">
                        {hasFilters ? 'Prueba cambiando los filtros' : 'Registra la primera entrada o salida de esta sección'}
                      </div>
                      {!hasFilters && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => openNew('ENTRY')}>↓ Entrada</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openNew('EXIT')}>↑ Salida</button>
                        </div>
                      )}
                    </div>
                  </td></tr>
                ) : (
                  movements.map(m => {
                    const cfg   = MOVEMENT_CONFIG[m.movementType]
                    const delta = m.quantityAfter - m.quantityBefore
                    const item  = m.item
                    const user  = m.createdBy
                    return (
                      <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setViewMov(m)}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0D1B2A' }}>{item?.name ?? '—'}</div>
                          {item?.unit && <div style={{ fontSize: 11, color: '#9db5c8', marginTop: 2 }}>{item.unit}</div>}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cfg.color, fontSize: 13 }}>{cfg.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 15, color: delta >= 0 ? '#166534' : '#c53030' }}>
                            {delta >= 0 ? '+' : ''}{delta}
                          </span>
                          {item?.unit && <span style={{ fontSize: 11, color: '#9db5c8', marginLeft: 4 }}>{item.unit}</span>}
                        </td>
                        <td style={{ fontSize: 12.5, color: '#778DA9' }}>
                          <span style={{ color: '#415A77', fontWeight: 500 }}>{m.quantityBefore}</span>
                          <span style={{ margin: '0 5px', color: '#c8cdd6' }}>→</span>
                          <span style={{ color: '#0D1B2A', fontWeight: 700 }}>{m.quantityAfter}</span>
                        </td>
                        <td style={{ fontSize: 12, color: '#778DA9', whiteSpace: 'nowrap' }}>
                          {new Date(m.movementDate ?? m.createdAt).toLocaleDateString('es-CL')}
                        </td>
                        <td style={{ fontSize: 12, color: '#778DA9' }}>
                          {user?.fullName?.split(' ')[0] ?? '—'}
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
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
              <span style={{ fontSize: 12, color: '#778DA9' }}>{total} movimiento{total !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Anterior</button>
                <span style={{ fontSize: 12, color: '#778DA9', padding: '6px 10px' }}>{page} / {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Siguiente →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
