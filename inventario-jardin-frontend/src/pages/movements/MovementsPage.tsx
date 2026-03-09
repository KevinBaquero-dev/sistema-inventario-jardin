// =============================================================================
// src/pages/movements/MovementsPage.tsx
// Historial de movimientos + Gráficas + Exportación PDF/Excel
// =============================================================================
import { useEffect, useState, useCallback } from 'react'
import { movementsApi }   from '../../api/movements.api'
import { sectionsApi }    from '../../api/sections.api'
import { useToast }       from '../../components/ui/Toast'
import MovementDetailModal from './MovementDetailModal'
import ReportChartsSection from './ReportChartsSection'
import { MOVEMENT_CONFIG, MOVEMENT_TYPES } from './movement.config'
import type { Movement, Section, MovementType } from '../../types'
import type { FullReport, ReportSummaryEntry } from '../../api/movements.api'

function defaultFrom() {
  const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10)
}
function defaultTo() { return new Date().toISOString().slice(0, 10) }

function SkRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div className="skeleton" style={{ height: 14, width: i === 1 ? '70%' : i === 3 ? '50%' : '65%' }} />
        </td>
      ))}
    </tr>
  )
}

function TypeBadge({ type }: { type: MovementType }) {
  const cfg = MOVEMENT_CONFIG[type]
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cfg.color, fontSize: '13px' }}>{cfg.icon}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

function SummaryCard({ type, count, total }: { type: MovementType; count: number; total: number }) {
  const cfg = MOVEMENT_CONFIG[type]
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontFamily: 'monospace', color: cfg.color, fontWeight: 700, flexShrink: 0 }}>
        {cfg.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}s</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: cfg.color }}>{count}</span>
          <span style={{ fontSize: '12px', color: '#9db5c8' }}>movs.</span>
        </div>
        {total > 0 && <div style={{ fontSize: '11.5px', color: '#778DA9', marginTop: '2px' }}>{total} u. totales</div>}
      </div>
    </div>
  )
}

function ExportBtn({ label, icon, color, bg, border, onClick, loading }: {
  label: string; icon: string; color: string; bg: string; border: string
  onClick: () => void; loading: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 9, cursor: loading ? 'wait' : 'pointer',
      border: `1.5px solid ${border}`, background: bg, color,
      fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      {loading ? 'Generando…' : label}
    </button>
  )
}

export default function MovementsPage() {
  const { toast } = useToast()

  const [activeTab,     setActiveTab]     = useState<'history' | 'charts'>('history')
  const [movements,     setMovements]     = useState<Movement[]>([])
  const [allMovements,  setAllMovements]  = useState<Movement[]>([])
  const [reportSummary, setReportSummary] = useState<Record<string, ReportSummaryEntry>>({})
  const [sections,      setSections]      = useState<Section[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [total,         setTotal]         = useState(0)
  const [exporting,     setExporting]     = useState<'excel' | 'pdf' | null>(null)

  const [typeFilter,    setTypeFilter]    = useState<MovementType | ''>('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [dateFrom,      setDateFrom]      = useState(defaultFrom)
  const [dateTo,        setDateTo]        = useState(defaultTo)
  const [page,          setPage]          = useState(1)
  const LIMIT = 15

  const [viewMov, setViewMov] = useState<Movement | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await movementsApi.getAll({
        page, limit: LIMIT,
        movementType: typeFilter    || undefined,
        sectionId:    sectionFilter || undefined,
        dateFrom:     dateFrom      || undefined,
        dateTo:       dateTo        || undefined,
        sortOrder: 'desc',
      })
      const data = res.data.data ?? []
      setMovements(data)
      setTotal(res.data.meta?.total ?? 0)
    } catch {
      toast('error', 'Error', 'No se pudieron cargar los movimientos')
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, sectionFilter, dateFrom, dateTo, toast])

  const loadReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return
    setLoadingReport(true)
    try {
      const res    = await movementsApi.getReport({
        dateFrom, dateTo,
        sectionId:    sectionFilter || undefined,
        movementType: typeFilter    || undefined,
      })
      const report = res.data.data as FullReport
      setAllMovements(report?.movements ?? [])
      setReportSummary(report?.summary  ?? {})
    } catch {
      // silencioso
    } finally {
      setLoadingReport(false)
    }
  }, [dateFrom, dateTo, sectionFilter, typeFilter])

  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => { setPage(1) },    [typeFilter, sectionFilter, dateFrom, dateTo])
  useEffect(() => { loadReport() },  [loadReport])
  useEffect(() => {
    sectionsApi.getAll({ isActive: true }).then(res => setSections(res.data.data ?? []))
  }, [])

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revocar después de un tick para que el browser complete la descarga
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  async function handleExportExcel() {
    if (!dateFrom || !dateTo) { toast('warning', 'Sin fechas', 'Selecciona un período'); return }
    setExporting('excel')
    try {
      const res = await movementsApi.exportExcel({
        dateFrom, dateTo,
        sectionId:    sectionFilter  || undefined,
        movementType: typeFilter     || undefined,
      })
      const filename = `reporte-movimientos_${dateFrom}_${dateTo}.xlsx`
      downloadBlob(res.data as Blob, filename)
      toast('success', 'Excel descargado', 'El archivo se guardó en tu equipo')
    } catch { toast('error', 'Error', 'No se pudo generar el Excel') }
    finally { setExporting(null) }
  }

  async function handleExportPDF() {
    if (!dateFrom || !dateTo) { toast('warning', 'Sin fechas', 'Selecciona un período'); return }
    setExporting('pdf')
    try {
      const res = await movementsApi.exportPDF({
        dateFrom, dateTo,
        sectionId:    sectionFilter  || undefined,
        movementType: typeFilter     || undefined,
      })
      const filename = `reporte-movimientos_${dateFrom}_${dateTo}.pdf`
      downloadBlob(res.data as Blob, filename)
      toast('success', 'PDF descargado', 'El archivo se guardó en tu equipo')
    } catch { toast('error', 'Error', 'No se pudo generar el PDF') }
    finally { setExporting(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const hasFilters = typeFilter || sectionFilter

  return (
    <>
      <MovementDetailModal open={!!viewMov} onClose={() => setViewMov(null)} movement={viewMov} />

      <div className="anim-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 className="page-title">Reportes</h2>
            <p className="page-subtitle">
              {allMovements.length > 0
                ? `${allMovements.length} movimiento${allMovements.length !== 1 ? 's' : ''} en el período`
                : 'Historial y análisis de movimientos'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ExportBtn label="Exportar Excel" icon="📊" color="#166534" bg="#f0fdf4" border="#bbf7d0" onClick={handleExportExcel} loading={exporting === 'excel'} />
            <ExportBtn label="Exportar PDF"   icon="📄" color="#c53030" bg="#fff5f5" border="#fca5a5" onClick={handleExportPDF}   loading={exporting === 'pdf'} />
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button className="btn btn-sm"
              onClick={() => setTypeFilter('')}
              style={{ border: `1.5px solid ${!typeFilter ? '#415A77' : '#dde1e7'}`, background: !typeFilter ? '#edf1f6' : '#fff', color: !typeFilter ? '#415A77' : '#778DA9', fontWeight: !typeFilter ? 700 : 500 }}>
              Todos
            </button>
            {MOVEMENT_TYPES.map(t => (
              <button key={t.value} className="btn btn-sm"
                onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
                style={{ border: `1.5px solid ${typeFilter === t.value ? t.color : t.border}`, background: typeFilter === t.value ? t.bg : '#fff', color: typeFilter === t.value ? t.color : '#778DA9', fontWeight: typeFilter === t.value ? 700 : 500 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <select className="input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', cursor: 'pointer' }}>
            <option value="">Todas las secciones</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '148px' }} title="Desde" />
            <span style={{ color: '#778DA9', fontSize: '13px' }}>→</span>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '148px' }} title="Hasta" />
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setTypeFilter(''); setSectionFilter('') }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Stats del reporte completo */}
        {!loadingReport && Object.values(reportSummary).some(s => s.count > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {(Object.entries(reportSummary) as [MovementType, ReportSummaryEntry][])
              .filter(([, s]) => s.count > 0)
              .map(([type, s]) => (
                <SummaryCard key={type} type={type} count={s.count} total={s.totalQuantity} />
              ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f0f2f5' }}>
          {([
            { key: 'history', label: '📋 Historial', badge: `${total} registros` },
            { key: 'charts',  label: '📊 Gráficas',  badge: `${allMovements.length} movimientos` },
          ] as const).map(tab => {
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: `2.5px solid ${active ? '#415A77' : 'transparent'}`,
                marginBottom: -2, cursor: 'pointer', fontFamily: 'inherit',
                color: active ? '#415A77' : '#778DA9', fontWeight: active ? 700 : 500,
                fontSize: 13.5, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {tab.label}
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, background: active ? '#edf1f6' : '#f5f6f8', color: active ? '#415A77' : '#9db5c8', fontWeight: 600 }}>
                  {tab.badge}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab: Historial */}
        {activeTab === 'history' && (
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
                    [1,2,3,4,5,6,7].map(i => <SkRow key={i} />)
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-state-icon">📋</div>
                          <div className="empty-state-title">{hasFilters ? 'Sin resultados' : 'Sin movimientos en este período'}</div>
                          <div className="empty-state-text">{hasFilters ? 'Prueba cambiando los filtros' : 'Ajusta el rango de fechas para ver movimientos'}</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movements.map(m => {
                      const cfg   = MOVEMENT_CONFIG[m.movementType]
                      const delta = m.quantityAfter - m.quantityBefore
                      return (
                        <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setViewMov(m)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${m.item.section.color ?? '#415A77'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>📦</div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D1B2A' }}>{m.item.name}</div>
                                <div style={{ fontSize: '11px', color: '#778DA9', marginTop: '1px' }}>{m.item.section.name}</div>
                              </div>
                            </div>
                          </td>
                          <td><TypeBadge type={m.movementType} /></td>
                          <td>
                            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '15px', color: cfg.color }}>
                              {delta > 0 ? '+' : ''}{delta}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#9db5c8', marginLeft: '4px' }}>{m.item.unit}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#778DA9' }}>
                              <span style={{ fontWeight: 600, color: '#415A77' }}>{m.quantityBefore}</span>
                              <span style={{ fontFamily: 'monospace', color: cfg.color }}>{cfg.icon}</span>
                              <span style={{ fontWeight: 700, color: cfg.color }}>{m.quantityAfter}</span>
                              <span style={{ fontSize: '11px', color: '#c8cdd6' }}>{m.item.unit}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#778DA9' }}>
                            {new Date(m.movementDate).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,#415A77,#778DA9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {m.createdBy.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}
                              </div>
                              <span style={{ fontSize: '12.5px', color: '#415A77', fontWeight: 500 }}>
                                {m.createdBy.fullName.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

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
        )}

        {/* Tab: Gráficas */}
        {activeTab === 'charts' && (
          <ReportChartsSection
            movements={allMovements}
            loading={loadingReport}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}

        {/* Motivos frecuentes */}
        {activeTab === 'history' && !loading && movements.some(m => m.reason) && (
          <div className="card anim-fade-up" style={{ padding: '18px 22px' }}>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '15px', fontWeight: 700, color: '#0D1B2A', margin: '0 0 14px 0' }}>Motivos frecuentes</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Array.from(new Set(movements.filter(m => m.reason).map(m => m.reason!))).slice(0, 10).map(reason => (
                <span key={reason} style={{ padding: '4px 12px', borderRadius: '999px', background: '#f5f6f8', border: '1px solid #dde1e7', fontSize: '12.5px', color: '#415A77', fontWeight: 500 }}>
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
