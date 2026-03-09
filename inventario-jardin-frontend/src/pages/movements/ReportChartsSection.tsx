// =============================================================================
// src/pages/movements/ReportChartsSection.tsx
// Sección de gráficas para la página de Reportes
// =============================================================================
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts'
import { useState } from 'react'
import type { Movement } from '../../types'

interface Props {
  movements: Movement[]
  loading: boolean
  dateFrom: string
  dateTo: string
}

// ── Colores ──────────────────────────────────────────────────────────────────
const ENTRY_COLOR  = '#166534'
const EXIT_COLOR   = '#c53030'
const ENTRY_LIGHT  = '#bbf7d0'
const EXIT_LIGHT   = '#fca5a5'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function buildDailyData(movements: Movement[], dateFrom: string, dateTo: string) {
  const from  = new Date(dateFrom)
  const to    = new Date(dateTo)
  const days: Record<string, { fecha: string; Entradas: number; Salidas: number }> = {}

  // Crear todas las fechas del rango
  const cur = new Date(from)
  while (cur <= to) {
    const key = cur.toISOString().slice(0, 10)
    days[key] = { fecha: formatDate(key), Entradas: 0, Salidas: 0 }
    cur.setDate(cur.getDate() + 1)
  }

  // Acumular movimientos
  movements.forEach(m => {
    const key  = (m.movementDate ?? m.createdAt).slice(0, 10)
    const qty  = Math.abs(Number(m.quantityAfter) - Number(m.quantityBefore))
    if (!days[key]) return
    if (m.movementType === 'ENTRY')  days[key].Entradas += qty
    if (m.movementType === 'EXIT')   days[key].Salidas  += qty
  })

  return Object.values(days)
}

function buildTopProducts(movements: Movement[]) {
  const map: Record<string, { name: string; total: number; entries: number; exits: number }> = {}

  movements.forEach(m => {
    const item = m.item
    if (!item?.name) return
    const qty  = Math.abs(Number(m.quantityAfter) - Number(m.quantityBefore))
    if (!map[item.name]) map[item.name] = { name: item.name, total: 0, entries: 0, exits: 0 }
    map[item.name].total += qty
    if (m.movementType === 'ENTRY') map[item.name].entries += qty
    if (m.movementType === 'EXIT')  map[item.name].exits  += qty
  })

  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

function buildPieData(movements: Movement[]) {
  const entries = movements.filter(m => m.movementType === 'ENTRY').length
  const exits   = movements.filter(m => m.movementType === 'EXIT').length
  const data = []
  if (entries > 0) data.push({ name: 'Entradas', value: entries, color: ENTRY_COLOR, bg: ENTRY_LIGHT })
  if (exits   > 0) data.push({ name: 'Salidas',  value: exits,   color: EXIT_COLOR,  bg: EXIT_LIGHT })
  return data
}

// ── Tooltip personalizado ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{name:string; value:number; color:string}>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e6ea', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <div style={{ fontWeight: 700, color: '#0D1B2A', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#415A77' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#0D1B2A' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Active Shape para pie chart ──────────────────────────────────────────────
function ActiveShape(props: Parameters<typeof Sector>[0] & { midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number; name?: string; value?: number }) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props as { cx:number; cy:number; innerRadius:number; outerRadius:number; startAngle:number; endAngle:number; fill:string; payload:{name:string}; percent:number; value:number }
  const sin = Math.sin(-((props.midAngle ?? 0) * Math.PI) / 180)
  const cos = Math.cos(-((props.midAngle ?? 0) * Math.PI) / 180)
  const sx = cx + (outerRadius + 10) * cos
  const sy = cy + (outerRadius + 10) * sin
  const mx = cx + (outerRadius + 30) * cos
  const my = cy + (outerRadius + 30) * sin
  const ex = mx + (cos >= 0 ? 1 : -1) * 22
  const ey = my
  const textAnchor = cos >= 0 ? 'start' : 'end'
  return (
    <g>
      <text x={cx} y={cy} dy={-8} textAnchor="middle" fill={fill} style={{ fontSize: 22, fontWeight: 700 }}>{value}</text>
      <text x={cx} y={cy} dy={14} textAnchor="middle" fill="#778DA9" style={{ fontSize: 12 }}>{payload.name}</text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={3} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 6 : -6)} y={ey} textAnchor={textAnchor} fill="#0D1B2A" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(1)}%`}</text>
    </g>
  )
}

// ── Skeleton chart ───────────────────────────────────────────────────────────
function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', gap: 10, padding: '0 8px' }}>
      <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 6 }} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {[60,80,45,90,70,55,85,40,75,65].map((h, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: '6px 6px 0 0' }} />
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ReportChartsSection({ movements, loading, dateFrom, dateTo }: Props) {
  const [activePieIdx, setActivePieIdx] = useState(0)

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}><ChartSkeleton height={280} /></div>
        <div className="card" style={{ padding: 24 }}><ChartSkeleton height={240} /></div>
        <div className="card" style={{ padding: 24 }}><ChartSkeleton height={240} /></div>
      </div>
    )
  }

  if (movements.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '60px 20px' }}>
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Sin datos para graficar</div>
        <div className="empty-state-text">Ajusta el período o los filtros para ver las gráficas</div>
      </div>
    )
  }

  const dailyData   = buildDailyData(movements, dateFrom, dateTo)
  const topProducts = buildTopProducts(movements)
  const pieData     = buildPieData(movements)

  // Truncar etiquetas largas del eje Y en productos
  const maxLabelLen = 22
  const truncate = (s: string) => s.length > maxLabelLen ? s.slice(0, maxLabelLen) + '…' : s

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Gráfica 1: Movimientos por día ── */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>Movimientos por día</div>
          <div style={{ fontSize: 12, color: '#778DA9', marginTop: 3 }}>
            Entradas y salidas registradas en el período seleccionado
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dailyData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: '#9db5c8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e6ea' }}
              interval={dailyData.length > 30 ? Math.floor(dailyData.length / 15) : 0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9db5c8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 12, color: '#415A77', paddingTop: 12 }}
            />
            <Bar dataKey="Entradas" fill={ENTRY_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Salidas"  fill={EXIT_COLOR}  radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Fila inferior: Dona + Top productos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>

        {/* Dona */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>Distribución</div>
            <div style={{ fontSize: 12, color: '#778DA9', marginTop: 3 }}>
              Proporción de tipos de movimiento
            </div>
          </div>
          {pieData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9db5c8', fontSize: 13 }}>
              Sin datos suficientes
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    activeIndex={activePieIdx}
                    activeShape={ActiveShape}
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIdx(index)}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Leyenda manual */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                    <span style={{ fontSize: 12, color: '#415A77' }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top 10 productos */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>Top productos por movimiento</div>
            <div style={{ fontSize: 12, color: '#778DA9', marginTop: 3 }}>
              Los 10 productos con mayor volumen de unidades movidas
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={topProducts.map(p => ({ ...p, name: truncate(p.name) }))}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9db5c8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#415A77' }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="entries" name="Entradas" fill={ENTRY_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} stackId="a" />
              <Bar dataKey="exits"   name="Salidas"  fill={EXIT_COLOR}  radius={[0, 4, 4, 0]} maxBarSize={14} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}
