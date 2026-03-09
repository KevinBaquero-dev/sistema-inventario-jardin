// =============================================================================
// src/pages/movements/MovementDetailModal.tsx
// Vista detallada de un movimiento
// =============================================================================
import Modal from '../../components/ui/Modal'
import { MOVEMENT_CONFIG } from './movement.config'
import type { Movement } from '../../types'

interface MovementDetailModalProps {
  open: boolean
  onClose: () => void
  movement: Movement | null
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f5f6f8' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13.5px', color: '#0D1B2A', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function MovementDetailModal({ open, onClose, movement: m }: MovementDetailModalProps) {
  if (!m) return null
  const cfg = MOVEMENT_CONFIG[m.movementType]
  const delta = m.quantityAfter - m.quantityBefore

  return (
    <Modal open={open} onClose={onClose} title="Detalle del movimiento" width={480}
      footer={<button className="btn btn-secondary" onClick={onClose}>Cerrar</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '12px', background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '13px', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'monospace', flexShrink: 0 }}>
            {cfg.icon}
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '18px', fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
            <div style={{ fontSize: '12.5px', color: cfg.color, opacity: 0.75, marginTop: '3px' }}>
              {new Date(m.movementDate).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Producto */}
        <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Producto</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${m.item.section.color ?? '#415A77'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
              📦
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0D1B2A' }}>{m.item.name}</div>
              <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>{m.item.section.name}{m.item.code ? ` · ${m.item.code}` : ''}</div>
            </div>
          </div>
        </div>

        {/* Stock delta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7', textAlign: 'center' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Antes</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '26px', fontWeight: 700, color: '#0D1B2A' }}>{m.quantityBefore}</div>
            <div style={{ fontSize: '11px', color: '#9db5c8', marginTop: '4px' }}>{m.item.unit}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '22px', color: cfg.color, fontWeight: 700 }}>{cfg.icon}</span>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '16px', fontWeight: 700, color: cfg.color }}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: `${cfg.bg}`, border: `1.5px solid ${cfg.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Después</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '26px', fontWeight: 700, color: cfg.color }}>{m.quantityAfter}</div>
            <div style={{ fontSize: '11px', color: '#9db5c8', marginTop: '4px' }}>{m.item.unit}</div>
          </div>
        </div>

        {/* Info extra */}
        <div>
          <Row label="Cantidad" value={`${m.quantity} ${m.item.unit}`} />
          <Row label="Motivo" value={m.reason} />
          <Row label="Notas" value={m.notes} />
          <Row label="Registrado por" value={m.createdBy.fullName} />
          <Row label="Fecha registro" value={new Date(m.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        </div>
      </div>
    </Modal>
  )
}
