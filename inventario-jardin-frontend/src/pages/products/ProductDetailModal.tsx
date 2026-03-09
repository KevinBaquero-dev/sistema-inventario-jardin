// =============================================================================
// src/pages/products/ProductDetailModal.tsx
// Vista detallada de un producto
// =============================================================================
import Modal from '../../components/ui/Modal'
import type { ProductFull } from '../../types'

interface ProductDetailModalProps {
  open: boolean
  onClose: () => void
  product: ProductFull | null
  onEdit?: () => void
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f6f8' }}>
      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13.5px', color: '#0D1B2A', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function ProductDetailModal({ open, onClose, product: p, onEdit }: ProductDetailModalProps) {
  if (!p) return null

  const stockPct = p.quantityMaximum
    ? Math.min(100, (p.quantityCurrent / p.quantityMaximum) * 100)
    : p.quantityMinimum > 0
      ? Math.min(100, (p.quantityCurrent / (p.quantityMinimum * 3)) * 100)
      : 100

  const stockColor = p.quantityCurrent === 0
    ? '#c53030'
    : p.quantityCurrent <= p.quantityMinimum
      ? '#b45309' : '#415A77'

  const stockLabel = p.quantityCurrent === 0
    ? 'Sin stock'
    : p.quantityCurrent <= p.quantityMinimum
      ? 'Stock bajo' : 'Normal'

  const sectionColor = p.section.color ?? '#415A77'

  return (
    <Modal open={open} onClose={onClose} title={p.name}
      subtitle={p.code ? `Código: ${p.code}` : p.section.name}
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#778DA9' }}>
            Creado {new Date(p.createdAt).toLocaleDateString('es-CL')}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            {onEdit && <button className="btn btn-primary" onClick={onEdit}>✏️ Editar</button>}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Sección badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: `${sectionColor}10`, border: `1.5px solid ${sectionColor}25` }}>
          <span style={{ fontSize: '20px' }}>{p.section.icon ?? '📁'}</span>
          <span style={{ fontSize: '13.5px', fontWeight: 600, color: sectionColor }}>{p.section.name}</span>
          {!p.isActive && (
            <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#f5f6f8', color: '#778DA9', border: '1px solid #dde1e7', fontWeight: 700 }}>Inactivo</span>
          )}
        </div>

        {/* Stock visual */}
        <div style={{ padding: '18px', borderRadius: '12px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Stock actual</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700, color: stockColor, lineHeight: 1 }}>{p.quantityCurrent}</span>
                <span style={{ fontSize: '14px', color: '#778DA9' }}>{p.unit}</span>
              </div>
            </div>
            <span className="badge" style={{
              background: p.quantityCurrent === 0 ? '#fee2e2' : p.quantityCurrent <= p.quantityMinimum ? '#fef3c7' : '#dbeafe',
              color: stockColor, fontSize: '12px', padding: '4px 12px',
            }}>
              {stockLabel}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: '#dde1e7', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', background: stockColor, width: `${stockPct}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#9db5c8', marginTop: '6px' }}>
            <span>Mínimo: {p.quantityMinimum} {p.unit}</span>
            {p.quantityMaximum && <span>Máximo: {p.quantityMaximum} {p.unit}</span>}
          </div>
        </div>

        {/* Info general */}
        <div>
          <InfoRow label="Descripción"   value={p.description} />
          <InfoRow label="Ubicación"     value={p.location} />
          <InfoRow label="Unidad"        value={p.unit} />
          <InfoRow label="Código"        value={p.code} />
          <InfoRow label="Actualizado"   value={new Date(p.updatedAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        </div>

        {/* Custom fields */}
        {p.fieldValues && p.fieldValues.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Campos adicionales</div>
            {p.fieldValues.map(fv => {
              const ft = fv.field.fieldType
              let displayValue: React.ReactNode = '—'
              if (ft === 'BOOLEAN') displayValue = fv.valueBoolean ? '✅ Sí' : '❌ No'
              else if (ft === 'DROPDOWN') {
                const opt = fv.field.dropdownOptions?.find(o => o.id === fv.valueOptionId)
                displayValue = opt?.label ?? '—'
              }
              else if (ft === 'DATE') displayValue = fv.valueDate ? new Date(fv.valueDate).toLocaleDateString('es-CL') : '—'
              else if (ft === 'NUMBER') displayValue = fv.valueNumber?.toString() ?? '—'
              else displayValue = fv.valueText ?? '—'
              return <InfoRow key={fv.fieldId} label={fv.field.label || fv.field.name} value={displayValue} />
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
