// =============================================================================
// src/pages/dashboard/DashboardPage.tsx
// =============================================================================
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { getStockSummary, getLowStock, getRecentMovements, getSections } from '../../api/dashboard.api'
import { productsApi } from '../../api/products.api'
import type { StockSummary, Movement, Section, ProductFull } from '../../types'
import Modal from '../../components/ui/Modal'

/* ── Skeleton ── */
function Sk({ h=18, w='100%', r=8 }: { h?:number; w?:string|number; r?:number }) {
  return <div className="skeleton" style={{ height:h, width:w, borderRadius:r, flexShrink:0 }} />
}

/* ── StatCard clicable ── */
interface StatCardProps {
  label:string; value:string|number; icon:string
  accent:string; accentBg:string; sub?:string; delay?:string
  onClick?: () => void
}
function StatCard({ label, value, icon, accent, accentBg, sub, delay='', onClick }: StatCardProps) {
  return (
    <div
      className={`card card-hover anim-fade-up ${delay}`}
      style={{ padding:'22px', cursor: onClick ? 'pointer' : 'default', transition:'all 0.15s' }}
      onClick={onClick}
      title={onClick ? `Ver productos: ${label}` : undefined}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'11px', fontWeight:800, color:'#778DA9', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'10px' }}>{label}</div>
          <div style={{ fontFamily:'Fraunces,serif', fontSize:'36px', fontWeight:700, color:'#0D1B2A', lineHeight:1, letterSpacing:'-0.02em' }}>{value}</div>
          {sub && <div style={{ fontSize:'12px', color:'#778DA9', marginTop:'7px' }}>{sub}</div>}
        </div>
        <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:accentBg, border:`1.5px solid ${accent}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop:'18px', height:'3px', borderRadius:'999px', background:`linear-gradient(90deg, ${accent}40, transparent)` }} />
      {onClick && (
        <div style={{ marginTop:'8px', fontSize:'11px', color:accent, fontWeight:600, opacity:0.7 }}>
          Ver detalle →
        </div>
      )}
    </div>
  )
}

/* ── Movement badge ── */
const MV: Record<string, { label:string; color:string; bg:string; sign:string }> = {
  ENTRY:      { label:'Entrada',       color:'#15803d', bg:'#dcfce7', sign:'+' },
  EXIT:       { label:'Salida',        color:'#c53030', bg:'#fee2e2', sign:'−' },
  TRANSFER:   { label:'Transferencia', color:'#1d4ed8', bg:'#dbeafe', sign:'⇄' },
  ADJUSTMENT: { label:'Ajuste',        color:'#b45309', bg:'#fef3c7', sign:'≈' },
}

type FilterMode = 'total' | 'active' | 'lowStock' | 'outOfStock' | null

const FILTER_META: Record<Exclude<FilterMode, null>, { title: string; subtitle: string; icon: string; accent: string }> = {
  total:      { title: 'Todos los productos',        subtitle: 'Inventario completo',         icon: '📦', accent: '#415A77' },
  active:     { title: 'Productos activos',          subtitle: 'Disponibles en inventario',   icon: '✅', accent: '#15803d' },
  lowStock:   { title: 'Productos con stock bajo',   subtitle: 'Por debajo del mínimo',       icon: '⚠️', accent: '#b45309' },
  outOfStock: { title: 'Productos sin stock',        subtitle: 'Cantidad en cero',            icon: '🔴', accent: '#c53030' },
}

/* ── Modal de productos filtrados ── */
function ProductsFilterModal({ mode, onClose }: { mode: FilterMode; onClose: () => void }) {
  const [products, setProducts] = useState<ProductFull[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!mode) return
    setLoading(true)
    const params: Parameters<typeof productsApi.getAll>[0] = { limit: 100, sortBy: 'name', sortOrder: 'asc' }
    if (mode === 'active')     params.isActive = true
    if (mode === 'lowStock')   params.lowStock = true
    if (mode === 'outOfStock') params.lowStock = true  // filtramos en memoria
    // total: sin filtros extra

    productsApi.getAll(params).then(res => {
      let data = res.data.data ?? []
      if (mode === 'outOfStock') data = data.filter(p => Number(p.quantityCurrent) === 0)
      setProducts(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [mode])

  if (!mode) return null
  const meta = FILTER_META[mode]

  return (
    <Modal open={!!mode} onClose={onClose} title={meta.title} subtitle={meta.subtitle} width={640}>
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4,5].map(i => <Sk key={i} h={44} r={10} />)}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:'#778DA9' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>{meta.icon}</div>
          <div style={{ fontWeight:600 }}>No hay productos en esta categoría</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {products.map(p => {
            const cur = Number(p.quantityCurrent)
            const min = Number(p.quantityMinimum)
            const color = cur === 0 ? '#c53030' : cur <= min ? '#b45309' : '#415A77'
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:10, background:'#f5f6f8', border:'1px solid #dde1e7' }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${p.section?.color ?? '#415A77'}15`, border:`1.5px solid ${p.section?.color ?? '#415A77'}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {p.section?.icon ?? '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0D1B2A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize:12, color:'#778DA9', marginTop:2 }}>{p.section?.name} · {p.unit}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'Fraunces,serif', fontSize:18, fontWeight:700, color }}>{cur}</div>
                  <div style={{ fontSize:11, color:'#9db5c8' }}>mín: {min}</div>
                </div>
                {cur === 0 && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#fee2e2', color:'#c53030', border:'1px solid #fca5a5' }}>SIN STOCK</span>
                )}
                {cur > 0 && cur <= min && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999, background:'#fef3c7', color:'#b45309', border:'1px solid #fde68a' }}>BAJO</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const [summary,   setSummary]   = useState<StockSummary|null>(null)
  const [lowItems,  setLowItems]  = useState<{ name?:string; quantityCurrent?:number; unit?:string; section?:{ name?:string } }[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [sections,  setSections]  = useState<Section[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [s, l, m, sec] = await Promise.all([getStockSummary(), getLowStock(), getRecentMovements(), getSections()])
        setSummary(s.data.data ?? null)
        setLowItems((l.data.data as typeof lowItems) ?? [])
        setMovements((m.data.data as Movement[]) ?? [])
        setSections((sec.data.data as Section[]) ?? [])
      } catch { setError('No se pudieron cargar los datos') }
      finally { setLoading(false) }
    })()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = user?.fullName?.split(' ')[0] ?? 'Usuario'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

      <ProductsFilterModal mode={filterMode} onClose={() => setFilterMode(null)} />

      {/* ── Bienvenida ── */}
      <div className="anim-fade-up" style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <p style={{ fontSize:'13px', color:'#778DA9', fontWeight:500, marginBottom:'4px' }}>{greeting}</p>
          <h2 style={{ fontFamily:'Fraunces,serif', fontSize:'28px', fontWeight:700, color:'#0D1B2A', letterSpacing:'-0.02em', margin:0 }}>{firstName} 👋</h2>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px', borderRadius:'999px', background:'#fff', border:'1px solid #dde1e7', boxShadow:'0 1px 3px rgba(13,27,42,0.06)' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#22c55e', display:'inline-block', animation:'pulse-dot 2s ease-in-out infinite', boxShadow:'0 0 0 2px rgba(34,197,94,0.2)' }} />
            <span style={{ fontSize:'12.5px', fontWeight:600, color:'#15803d' }}>Sistema activo</span>
          </div>
          <div style={{ fontSize:'12px', color:'#778DA9', padding:'8px 14px', background:'#fff', border:'1px solid #dde1e7', borderRadius:'999px' }}>
            {new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error anim-fade-in">
          <span style={{ fontSize:'16px' }}>⚠️</span> {error}
        </div>
      )}

      {/* ── Stats clicables ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'14px' }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:'130px', borderRadius:'14px' }} />)
        ) : (
          <>
            <StatCard label="Total productos" value={summary?.total ?? 0}       icon="📦" accent="#415A77" accentBg="#edf1f6" sub="registrados"    delay="d-100" onClick={() => setFilterMode('total')} />
            <StatCard label="Activos"         value={summary?.active ?? 0}      icon="✅" accent="#15803d" accentBg="#dcfce7" sub="disponibles"    delay="d-200" onClick={() => setFilterMode('active')} />
            <StatCard label="Stock bajo"      value={lowItems.length}           icon="⚠️" accent="#b45309" accentBg="#fef3c7" sub="bajo el mínimo" delay="d-300" onClick={() => setFilterMode('lowStock')} />
            <StatCard label="Sin stock"       value={summary?.outOfStock ?? 0}  icon="🔴" accent="#c53030" accentBg="#fee2e2" sub="agotados"       delay="d-400" onClick={() => setFilterMode('outOfStock')} />
          </>
        )}
      </div>

      {/* ── Alerta stock bajo ── */}
      {!loading && lowItems.length > 0 && (
        <div className="alert anim-fade-up d-200" style={{ background:'#fffbeb', borderColor:'#fde68a', color:'#92400e' }}>
          <span style={{ fontSize:'18px' }}>⚠️</span>
          <span><strong>{lowItems.length}</strong> producto{lowItems.length !== 1 ? 's' : ''} {lowItems.length !== 1 ? 'están' : 'está'} por debajo del stock mínimo:{' '}
            {lowItems.slice(0, 3).map(i => i.name).join(', ')}
            {lowItems.length > 3 ? ` y ${lowItems.length - 3} más` : ''}.
          </span>
        </div>
      )}

      {/* ── Contenido principal ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'20px' }}>

        {/* Movimientos recientes */}
        <div className="card anim-fade-up d-100" style={{ overflow:'hidden' }}>
          <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #dde1e7' }}>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:'16px', fontWeight:700, color:'#0D1B2A', margin:0 }}>Movimientos recientes</h3>
            <p style={{ fontSize:'12px', color:'#778DA9', margin:'3px 0 0' }}>Últimas 8 operaciones registradas</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Fecha</th><th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}>
                      {[1,2,3,4,5].map(j => (
                        <td key={j} style={{ padding:'12px 16px' }}><Sk h={12} w={j===1?'70%':'55%'} /></td>
                      ))}
                    </tr>
                  ))
                ) : movements.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">Sin movimientos</div>
                      <div className="empty-state-text">Los movimientos registrados aparecerán aquí</div>
                    </div>
                  </td></tr>
                ) : (
                  movements.map(m => {
                    const mv   = MV[m.movementType] ?? MV.ENTRY
                    const delta = m.quantityAfter - m.quantityBefore
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight:600, fontSize:'13px', color:'#0D1B2A' }}>{m.item?.name ?? '—'}</div>
                          <div style={{ fontSize:'11px', color:'#9db5c8', marginTop:'2px' }}>{m.item?.section?.name ?? ''}</div>
                        </td>
                        <td>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 9px', borderRadius:'999px', background:mv.bg, fontSize:'12px', fontWeight:700, color:mv.color }}>
                            {mv.sign} {mv.label}
                          </span>
                        </td>
                        <td style={{ fontFamily:'Fraunces,serif', fontWeight:700, color: delta > 0 ? '#15803d' : delta < 0 ? '#c53030' : '#415A77', fontSize:'14px' }}>
                          {delta > 0 ? '+' : ''}{delta} <span style={{ fontSize:'11px', fontWeight:400, color:'#9db5c8' }}>{m.item?.unit ?? ''}</span>
                        </td>
                        <td style={{ fontSize:'12px', color:'#778DA9' }}>
                          {new Date(m.movementDate ?? m.createdAt).toLocaleDateString('es-CL')}
                        </td>
                        <td style={{ fontSize:'12px', color:'#778DA9' }}>
                          {m.createdBy?.fullName?.split(' ')[0] ?? '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secciones */}
        <div className="card anim-fade-up d-200" style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div>
            <h3 style={{ fontFamily:'Fraunces,serif', fontSize:'16px', fontWeight:700, color:'#0D1B2A', margin:0 }}>Secciones</h3>
            <p style={{ fontSize:'12px', color:'#778DA9', margin:'3px 0 0' }}>Áreas activas del jardín</p>
          </div>
          {loading ? (
            [1,2,3,4].map(i => <Sk key={i} h={56} r={10} />)
          ) : sections.length === 0 ? (
            <div className="empty-state" style={{ padding:'24px 0' }}>
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-title">Sin secciones</div>
            </div>
          ) : (
            sections.filter(s => s.isActive).map(s => {
              const color = s.color ?? '#415A77'
              return (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', borderRadius:'10px', background:'#f5f6f8', border:'1px solid #dde1e7' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`${color}15`, border:`1.5px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                    {s.icon ?? '📁'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:'13.5px', color:'#0D1B2A' }}>{s.name}</div>
                    <div style={{ fontSize:'11.5px', color:'#9db5c8', marginTop:'1px' }}>{s._count?.items ?? 0} productos</div>
                  </div>
                  <div style={{ fontFamily:'Fraunces,serif', fontSize:'20px', fontWeight:700, color }}>{s._count?.items ?? 0}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
