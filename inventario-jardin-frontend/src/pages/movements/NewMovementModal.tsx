// =============================================================================
// src/pages/movements/NewMovementModal.tsx
// Modal para registrar nuevos movimientos (entrada, salida, transferencia, ajuste)
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { movementsApi, type CreateMovementPayload } from '../../api/movements.api'
import { productsApi } from '../../api/products.api'
import { sectionsApi } from '../../api/sections.api'
import { useToast } from '../../components/ui/Toast'
import { MOVEMENT_TYPES, MOVEMENT_CONFIG } from './movement.config'
import type { ProductFull, Section, MovementType } from '../../types'

interface NewMovementModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  defaultProductId?: string
  defaultType?: MovementType
  defaultSectionId?: string  // pre-filtra el selector de productos
}

export default function NewMovementModal({ open, onClose, onSuccess, defaultProductId, defaultType, defaultSectionId }: NewMovementModalProps) {
  const { toast } = useToast()

  // Step 1: tipo de movimiento
  const [movType, setMovType] = useState<MovementType>(defaultType ?? 'ENTRY')

  // Step 2: producto origen
  const [sections,       setSections]       = useState<Section[]>([])
  const [sectionFilter,  setSectionFilter]  = useState('')
  const [productSearch,  setProductSearch]  = useState('')
  const [products,       setProducts]       = useState<ProductFull[]>([])
  const [loadingProds,   setLoadingProds]   = useState(false)
  const [selectedProd,   setSelectedProd]   = useState<ProductFull | null>(null)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Producto destino (solo TRANSFER)
  const [destSearch,  setDestSearch]  = useState('')
  const [destProducts, setDestProducts] = useState<ProductFull[]>([])
  const [loadingDest, setLoadingDest] = useState(false)
  const [selectedDest, setSelectedDest] = useState<ProductFull | null>(null)
  const [showDestDrop, setShowDestDrop] = useState(false)

  // Step 3: datos del movimiento
  const [quantity, setQuantity]     = useState('')
  const [reason,   setReason]       = useState('')
  const [notes,    setNotes]        = useState('')
  const [unitCost, setUnitCost]     = useState('')
  const [movDate,  setMovDate]      = useState(new Date().toISOString().slice(0, 10))

  const [step,    setStep]    = useState<1 | 2 | 3>(1)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    setMovType(defaultType ?? 'ENTRY')
    setSelectedProd(null); setProductSearch(''); setProducts([])
    setSelectedDest(null); setDestSearch(''); setDestProducts([])
    setQuantity(''); setReason(''); setNotes(''); setUnitCost('')
    setMovDate(new Date().toISOString().slice(0, 10))
    setErrors({}); setSectionFilter(defaultSectionId ?? '')
    // Si viene tipo pre-seleccionado (desde sección), saltar al paso 2 directamente
    setStep(defaultProductId ? 2 : defaultType ? 2 : 1)
  }, [open, defaultProductId, defaultType])

  // Cargar secciones
  useEffect(() => {
    if (!open) return
    sectionsApi.getAll({ isActive: true }).then(res => setSections(res.data.data ?? []))
  }, [open])

  // Si viene con producto por defecto
  useEffect(() => {
    if (!open || !defaultProductId) return
    productsApi.getById(defaultProductId).then(res => {
      if (res.data.data) setSelectedProd(res.data.data)
    })
  }, [open, defaultProductId])

  // Buscar productos origen
  useEffect(() => {
    if (!showDropdown) return
    const t = setTimeout(async () => {
      setLoadingProds(true)
      try {
        const res = await productsApi.getAll({ search: productSearch || undefined, sectionId: sectionFilter || undefined, isActive: true, limit: 8 })
        setProducts(res.data.data ?? [])
      } finally { setLoadingProds(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [productSearch, sectionFilter, showDropdown])

  // Buscar productos destino
  useEffect(() => {
    if (!showDestDrop) return
    const t = setTimeout(async () => {
      setLoadingDest(true)
      try {
        const res = await productsApi.getAll({ search: destSearch || undefined, isActive: true, limit: 8 })
        setDestProducts((res.data.data ?? []).filter(p => p.id !== selectedProd?.id))
      } finally { setLoadingDest(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [destSearch, showDestDrop, selectedProd])

  function validate() {
    const e: Record<string, string> = {}
    if (!selectedProd)                    e.product  = 'Selecciona un producto'
    if (!quantity || Number(quantity) <= 0) e.quantity = 'La cantidad debe ser mayor a 0'
    if (movType === 'EXIT' && selectedProd) {
      if (Number(quantity) > selectedProd.quantityCurrent) e.quantity = `Stock insuficiente (disponible: ${selectedProd.quantityCurrent} ${selectedProd.unit})`
    }
    if (movType === 'TRANSFER' && !selectedDest) e.dest = 'Selecciona el producto destino'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: CreateMovementPayload = {
        itemId: selectedProd!.id,
        movementType: movType,
        quantity: Number(quantity),
        destinationItemId: movType === 'TRANSFER' ? selectedDest!.id : undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        unitCost: unitCost ? Number(unitCost) : undefined,
        movementDate: new Date(movDate + 'T12:00:00').toISOString(),
      }
      await movementsApi.create(payload)
      toast('success', 'Movimiento registrado',
        `${MOVEMENT_CONFIG[movType].label} de ${quantity} ${selectedProd!.unit} — ${selectedProd!.name}`)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrar'
      toast('error', 'Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const cfg = MOVEMENT_CONFIG[movType]

  return (
    <Modal
      open={open} onClose={onClose}
      title="Registrar movimiento"
      subtitle="Selecciona el tipo, el producto y los detalles del movimiento"
      width={640}
      footer={
        step === 3 ? (
          <>
            <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={loading}>← Atrás</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="spinner" />Registrando...</> : 'Confirmar movimiento'}
            </button>
          </>
        ) : step === 2 ? (
          <>
            <button className="btn btn-secondary" onClick={() => { if (!defaultProductId) setStep(1) }} disabled={!!defaultProductId}>← Atrás</button>
            <button className="btn btn-primary" disabled={!selectedProd || (movType === 'TRANSFER' && !selectedDest)}
              onClick={() => { if (validate()) {} ; setStep(3) }}
              style={{ opacity: (!selectedProd || (movType === 'TRANSFER' && !selectedDest)) ? 0.5 : 1 }}>
              Continuar →
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => setStep(2)}>
            Continuar →
          </button>
        )
      }
    >
      {/* ── Progress bar ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {(['Tipo', 'Producto', 'Detalles'] as const).map((label, i) => {
          const s = i + 1
          const active = step === s
          const done   = step > s
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: '4px', borderRadius: '999px', background: done ? '#415A77' : active ? '#778DA9' : '#e8eaed', transition: 'background 0.2s' }} />
              <span style={{ fontSize: '11px', fontWeight: active || done ? 700 : 500, color: active ? '#415A77' : done ? '#1B263B' : '#9db5c8' }}>{label}</span>
            </div>
          )
        })}
      </div>

      {/* ════════ STEP 1: Tipo ════════ */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13.5px', color: '#778DA9', marginBottom: '6px' }}>¿Qué tipo de movimiento quieres registrar?</p>
          {MOVEMENT_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setMovType(t.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '18px 20px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${movType === t.value ? t.color : '#dde1e7'}`,
                background: movType === t.value ? t.bg : '#fff',
                transition: 'all 0.15s', textAlign: 'left', width: '100%',
              }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                background: movType === t.value ? t.color : '#f5f6f8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 700, color: movType === t.value ? '#fff' : '#778DA9',
                fontFamily: 'monospace', transition: 'all 0.15s',
              }}>
                {t.icon}
              </div>
              <div>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: movType === t.value ? t.color : '#0D1B2A' }}>{t.label}</div>
                <div style={{ fontSize: '12.5px', color: '#778DA9', marginTop: '2px' }}>{t.description}</div>
              </div>
              {movType === t.value && (
                <div style={{ marginLeft: 'auto', width: '20px', height: '20px', borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ════════ STEP 2: Producto ════════ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Tipo seleccionado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
            <span style={{ fontSize: '18px', fontFamily: 'monospace', color: cfg.color, fontWeight: 700 }}>{cfg.icon}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
            <span style={{ fontSize: '12.5px', color: cfg.color, opacity: 0.7, marginLeft: '4px' }}>— {cfg.description}</span>
          </div>

          {/* Producto origen */}
          <div className="form-group">
            <label className="label">Producto {movType === 'TRANSFER' ? 'origen' : ''} *</label>
            {selectedProd ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: '#edf1f6', border: '1.5px solid #415A77' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${selectedProd.section.color ?? '#415A77'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                  {selectedProd.section.icon ?? '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>{selectedProd.name}</div>
                  <div style={{ fontSize: '11.5px', color: '#778DA9', marginTop: '2px' }}>
                    {selectedProd.section.name} · Stock: <strong style={{ color: selectedProd.quantityCurrent <= selectedProd.quantityMinimum ? '#b45309' : '#166534' }}>{selectedProd.quantityCurrent}</strong> {selectedProd.unit}
                  </div>
                </div>
                {!defaultProductId && (
                  <button type="button" onClick={() => { setSelectedProd(null); setProductSearch(''); setTimeout(() => searchRef.current?.focus(), 50) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#778DA9', fontSize: '16px', flexShrink: 0 }}>✕</button>
                )}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select className="input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '150px', cursor: 'pointer' }}>
                    <option value="">Todas las secciones</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                </div>
                <input ref={searchRef} className="input" value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar producto por nombre o código..."
                  autoFocus
                />
                {showDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #dde1e7', borderTop: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 8px 24px rgba(13,27,42,0.1)', zIndex: 50, maxHeight: '280px', overflowY: 'auto' }}>
                    {loadingProds ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#778DA9', fontSize: '13px' }}>Buscando...</div>
                    ) : products.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#9db5c8', fontSize: '13px' }}>Sin resultados</div>
                    ) : (
                      products.map(p => (
                        <div key={p.id} onClick={() => { setSelectedProd(p); setShowDropdown(false); setProductSearch('') }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f6f8'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${p.section.color ?? '#415A77'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                            {p.section.icon ?? '📦'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D1B2A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#778DA9' }}>{p.section.name} · {p.quantityCurrent} {p.unit}</div>
                          </div>
                          {p.quantityCurrent <= p.quantityMinimum && (
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: '#fef3c7', color: '#b45309', fontWeight: 700, flexShrink: 0 }}>⚠ Bajo</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.product && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.product}</span>}
          </div>

          {/* Producto destino (solo TRANSFER) */}
          {movType === 'TRANSFER' && (
            <div className="form-group">
              <label className="label">Producto destino *</label>
              {selectedDest ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: '#eff6ff', border: '1.5px solid #1e40af' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${selectedDest.section.color ?? '#415A77'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {selectedDest.section.icon ?? '📦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>{selectedDest.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#778DA9' }}>{selectedDest.section.name} · {selectedDest.quantityCurrent} {selectedDest.unit}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedDest(null); setDestSearch('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#778DA9', fontSize: '16px' }}>✕</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input className="input" value={destSearch}
                    onChange={e => { setDestSearch(e.target.value); setShowDestDrop(true) }}
                    onFocus={() => setShowDestDrop(true)}
                    placeholder="Buscar producto destino..."
                  />
                  {showDestDrop && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #dde1e7', borderTop: 'none', borderRadius: '0 0 10px 10px', boxShadow: '0 8px 24px rgba(13,27,42,0.1)', zIndex: 50, maxHeight: '180px', overflowY: 'auto' }}>
                      {loadingDest ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: '#778DA9', fontSize: '13px' }}>Buscando...</div>
                      ) : destProducts.length === 0 ? (
                        <div style={{ padding: '14px', textAlign: 'center', color: '#9db5c8', fontSize: '13px' }}>Sin resultados</div>
                      ) : (
                        destProducts.map(p => (
                          <div key={p.id} onClick={() => { setSelectedDest(p); setShowDestDrop(false); setDestSearch('') }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f6f8'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#edf1f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{p.section.icon ?? '📦'}</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D1B2A' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: '#778DA9' }}>{p.section.name}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              {errors.dest && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.dest}</span>}
            </div>
          )}
        </div>
      )}

      {/* ════════ STEP 3: Detalles ════════ */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Resumen producto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
            <span style={{ fontSize: '20px' }}>{selectedProd!.section.icon ?? '📦'}</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0D1B2A' }}>{selectedProd!.name}</div>
              <div style={{ fontSize: '12px', color: '#778DA9' }}>
                Stock actual: <strong style={{ color: '#415A77' }}>{selectedProd!.quantityCurrent} {selectedProd!.unit}</strong>
                {movType === 'TRANSFER' && selectedDest && (
                  <> → <strong style={{ color: '#1e40af' }}>{selectedDest.name}</strong></>
                )}
              </div>
            </div>
            <span className="badge" style={{ marginLeft: 'auto', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>

          {/* Cantidad */}
          <div className="form-group">
            <label className="label">
              {movType === 'ADJUSTMENT' ? 'Nuevo stock total *' : 'Cantidad *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input className="input" type="number" min="0.01" step="0.01" value={quantity}
                onChange={e => setQuantity(e.target.value)} placeholder="0"
                autoFocus
                style={{ paddingRight: '80px' }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#778DA9', pointerEvents: 'none' }}>
                {selectedProd!.unit}
              </span>
            </div>
            {/* Preview del resultado */}
            {quantity && Number(quantity) > 0 && movType !== 'ADJUSTMENT' && (
              <div style={{ fontSize: '12.5px', padding: '8px 12px', borderRadius: '8px', background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 500 }}>
                {movType === 'EXIT'
                  ? `Stock resultante: ${selectedProd!.quantityCurrent - Number(quantity)} ${selectedProd!.unit}`
                  : movType === 'ENTRY'
                    ? `Stock resultante: ${selectedProd!.quantityCurrent + Number(quantity)} ${selectedProd!.unit}`
                    : `Salida de ${quantity} ${selectedProd!.unit} desde ${selectedProd!.name}`}
              </div>
            )}
            {errors.quantity && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.quantity}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Fecha */}
            <div className="form-group">
              <label className="label">Fecha del movimiento</label>
              <input className="input" type="date" value={movDate} onChange={e => setMovDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)} />
            </div>
            {/* Costo unitario (solo ENTRY) */}
            {movType === 'ENTRY' && (
              <div className="form-group">
                <label className="label">Costo unitario <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" type="number" min="0" step="0.01" value={unitCost}
                  onChange={e => setUnitCost(e.target.value)} placeholder="$ 0" />
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="form-group">
            <label className="label">Motivo <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <input className="input" value={reason} onChange={e => setReason(e.target.value)}
              placeholder={
                movType === 'ENTRY' ? 'Ej: Compra mensual, Donación...'
                : movType === 'EXIT' ? 'Ej: Uso en sala cuna, Taller...'
                : movType === 'TRANSFER' ? 'Ej: Reasignación de materiales...'
                : 'Ej: Inventario físico, Error de registro...'
              }
            />
          </div>

          {/* Notas */}
          <div className="form-group">
            <label className="label">Notas <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones adicionales..." rows={2} style={{ resize: 'none' }} />
          </div>
        </div>
      )}
    </Modal>
  )
}
