// =============================================================================
// src/pages/products/ProductFormModal.tsx
// Modal crear/editar producto con campos dinámicos por sección
// =============================================================================
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { productsApi, type CreateProductPayload, type FieldValuePayload } from '../../api/products.api'
import { sectionsApi } from '../../api/sections.api'
import { useToast } from '../../components/ui/Toast'
import type { ProductFull, Section, CustomField } from '../../types'

const UNITS = ['unidades', 'cajas', 'bolsas', 'litros', 'kg', 'gramos', 'metros', 'paquetes', 'rollos', 'sets', 'pares']

interface ProductFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (p: ProductFull) => void
  editProduct?: ProductFull | null
  defaultSectionId?: string
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="form-group">{children}</div>
}

export default function ProductFormModal({ open, onClose, onSuccess, editProduct, defaultSectionId }: ProductFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!editProduct

  // Core fields
  const [name,        setName]        = useState('')
  const [code,        setCode]        = useState('')
  const [description, setDescription] = useState('')
  const [sectionId,   setSectionId]   = useState(defaultSectionId ?? '')
  const [unit,        setUnit]        = useState('unidades')
  const [customUnit,  setCustomUnit]  = useState('')
  const [location,    setLocation]    = useState('')
  const [qtyMin,      setQtyMin]      = useState('0')
  const [qtyMax,      setQtyMax]      = useState('')
  const [qtyInitial,  setQtyInitial]  = useState('0')
  const [isActive,    setIsActive]    = useState(true)

  // Dynamic fields
  const [sections,      setSections]      = useState<Section[]>([])
  const [customFields,  setCustomFields]  = useState<CustomField[]>([])
  const [fieldValues,   setFieldValues]   = useState<Record<string, string | number | boolean>>({})
  const [loadingFields, setLoadingFields] = useState(false)

  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState<'basic' | 'stock' | 'custom'>('basic')

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    setTab('basic'); setErrors({})

    if (editProduct) {
      setName(editProduct.name)
      setCode(editProduct.code ?? '')
      setDescription(editProduct.description ?? '')
      setSectionId(editProduct.section.id)
      const knownUnit = UNITS.includes(editProduct.unit)
      setUnit(knownUnit ? editProduct.unit : 'otro')
      setCustomUnit(knownUnit ? '' : editProduct.unit)
      setLocation(editProduct.location ?? '')
      setQtyMin(String(editProduct.quantityMinimum))
      setQtyMax(editProduct.quantityMaximum != null ? String(editProduct.quantityMaximum) : '')
      setQtyInitial('0')
      setIsActive(editProduct.isActive)
      // Field values
      const fv: Record<string, string | number | boolean> = {}
      editProduct.fieldValues?.forEach(fval => {
        const ft = fval.field.fieldType
        if (ft === 'BOOLEAN') fv[fval.fieldId] = fval.valueBoolean ?? false
        else if (ft === 'NUMBER') fv[fval.fieldId] = fval.valueNumber ?? ''
        else if (ft === 'DROPDOWN') {
          const opt = fval.field.dropdownOptions?.find(o => o.id === fval.valueOptionId)
          fv[fval.fieldId] = opt?.id ?? ''
        }
        else if (ft === 'DATE') fv[fval.fieldId] = fval.valueDate ? fval.valueDate.slice(0, 10) : ''
        else fv[fval.fieldId] = fval.valueText ?? ''
      })
      setFieldValues(fv)
    } else {
      setName(''); setCode(''); setDescription('')
      setSectionId(defaultSectionId ?? ''); setUnit('unidades'); setCustomUnit('')
      setLocation(''); setQtyMin('0'); setQtyMax(''); setQtyInitial('0')
      setIsActive(true); setFieldValues({})
    }
  }, [open, editProduct, defaultSectionId])

  // Cargar secciones
  useEffect(() => {
    if (!open) return
    sectionsApi.getAll({ isActive: true }).then(res => setSections(res.data.data ?? []))
  }, [open])

  // Cargar custom fields cuando cambia sección O cuando se abre el modal.
  // Depender de [sectionId, open] garantiza que al editar un producto
  // con sectionId ya prellenado los campos también se carguen al abrir.
  useEffect(() => {
    if (!open || !sectionId) { setCustomFields([]); return }
    setLoadingFields(true)
    sectionsApi.getFields(sectionId)
      .then(res => setCustomFields((res.data.data ?? []).filter(f => f.isActive)))
      .catch(() => setCustomFields([]))
      .finally(() => setLoadingFields(false))
  }, [sectionId, open])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim())    e.name    = 'El nombre es requerido'
    if (!sectionId)      e.section = 'Selecciona una sección'
    if (unit === 'otro' && !customUnit.trim()) e.unit = 'Especifica la unidad'
    const min = Number(qtyMin)
    const max = qtyMax !== '' ? Number(qtyMax) : null
    if (isNaN(min) || min < 0) e.qtyMin = 'Debe ser ≥ 0'
    if (max !== null && max < min) e.qtyMax = 'Debe ser mayor al mínimo'
    // Required custom fields
    customFields.filter(f => f.isRequired).forEach(f => {
      const v = fieldValues[f.id]
      if (v === undefined || v === '' || v === null) e[`field_${f.id}`] = `"${f.name}" es obligatorio`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // Si los campos personalizados todavía están cargando, esperar
    if (loadingFields) {
      toast('info' as never, 'Cargando campos...', 'Espera un momento y vuelve a intentarlo')
      return
    }
    const isValid = validate()
    // validate() setea errors internamente; leer el resultado para redirigir al tab correcto
    // Nota: usamos los campos directamente para no depender del estado asíncrono de errors
    if (!isValid) {
      const nameErr    = !name.trim()
      const sectionErr = !sectionId
      const unitErr    = unit === 'otro' && !customUnit.trim()
      const minErr     = isNaN(Number(qtyMin)) || Number(qtyMin) < 0
      const maxErr     = qtyMax !== '' && Number(qtyMax) < Number(qtyMin)
      const fieldErr   = customFields.filter(f => f.isRequired).some(f => {
        const v = fieldValues[f.id]
        return v === undefined || v === '' || v === null
      })
      if (nameErr || sectionErr || unitErr) setTab('basic')
      else if (minErr || maxErr)            setTab('stock')
      else if (fieldErr)                    setTab('custom')
      return
    }

    setLoading(true)
    const resolvedUnit = unit === 'otro' ? customUnit.trim() : unit

    // Build field values — formato { fieldId, value } que espera el backend
    const fvPayload: FieldValuePayload[] = customFields.map(f => {
      const raw = fieldValues[f.id]
      let value: string | number | boolean | null | undefined
      if (f.fieldType === 'TEXT')     value = String(raw ?? '')
      else if (f.fieldType === 'NUMBER')   value = raw !== '' && raw !== undefined ? Number(raw) : undefined
      else if (f.fieldType === 'DATE')     value = raw ? String(raw) : undefined
      else if (f.fieldType === 'BOOLEAN')  value = Boolean(raw)
      else if (f.fieldType === 'DROPDOWN') value = String(raw ?? '')
      return { fieldId: f.id, value }
    }).filter(fv => fv.value !== undefined && fv.value !== '')

    try {
      let result: ProductFull
      if (isEdit) {
        const payload: import('../../api/products.api').UpdateProductPayload = {
          name: name.trim(), code: code.trim() || undefined,
          description: description.trim() || undefined,
          unit: resolvedUnit, location: location.trim() || undefined,
          quantityMinimum: Number(qtyMin),
          quantityMaximum: qtyMax !== '' ? Number(qtyMax) : undefined,
          isActive, fieldValues: fvPayload,
        }
        const res = await productsApi.update(editProduct!.id, payload)
        result = res.data.data!
        toast('success', 'Producto actualizado', `"${result.name}" fue actualizado`)
      } else {
        const payload: CreateProductPayload = {
          name: name.trim(), code: code.trim() || undefined,
          description: description.trim() || undefined,
          sectionId, unit: resolvedUnit,
          location: location.trim() || undefined,
          quantityMinimum: Number(qtyMin),
          quantityMaximum: qtyMax !== '' ? Number(qtyMax) : undefined,
          quantityInitial: Number(qtyInitial) || undefined,
          fieldValues: fvPayload,
        }
        const res = await productsApi.create(payload)
        result = res.data.data!
        toast('success', 'Producto creado', `"${result.name}" fue creado exitosamente`)
      }
      onSuccess(result)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Ocurrió un error'
      toast('error', 'Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const selectedSection = sections.find(s => s.id === sectionId)
  const hasCustomFields = customFields.length > 0
  const tabs = [
    { id: 'basic',  label: 'Información',  hasError: !!(errors.name || errors.section || errors.unit) },
    { id: 'stock',  label: 'Stock',        hasError: !!(errors.qtyMin || errors.qtyMax) },
    ...(hasCustomFields ? [{ id: 'custom', label: 'Campos extra', hasError: Object.keys(errors).some(k => k.startsWith('field_')) }] : []),
  ] as { id: 'basic' | 'stock' | 'custom'; label: string; hasError: boolean }[]

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Editar producto' : 'Nuevo producto'}
      subtitle={isEdit ? `Editando "${editProduct?.name}"` : 'Registra un insumo o material en el inventario'}
      width={640}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner" />Guardando...</> : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#f5f6f8', borderRadius: '10px', padding: '4px' }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#fff' : 'transparent',
              boxShadow: tab === t.id ? '0 1px 3px rgba(13,27,42,0.08)' : 'none',
              fontSize: '13px', fontWeight: tab === t.id ? 700 : 500,
              color: t.hasError ? '#c53030' : tab === t.id ? '#0D1B2A' : '#778DA9',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
            {t.hasError && <span style={{ fontSize: '10px' }}>⚠</span>}
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Tab: Información básica ── */}
        {tab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Field>
              <label className="label">Nombre *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej: Resmas de papel A4, Jabón líquido..." autoFocus />
              {errors.name && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.name}</span>}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field>
                <label className="label">Código <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="PAP-001" />
              </Field>
              <Field>
                <label className="label">Sección *</label>
                <select className="input" value={sectionId} onChange={e => setSectionId(e.target.value)}
                  style={{ cursor: 'pointer' }} disabled={isEdit}>
                  <option value="">Seleccionar...</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
                {errors.section && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.section}</span>}
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field>
                <label className="label">Unidad de medida *</label>
                <select className="input" value={unit} onChange={e => setUnit(e.target.value)} style={{ cursor: 'pointer' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="otro">Otra unidad...</option>
                </select>
              </Field>
              {unit === 'otro' && (
                <Field>
                  <label className="label">Especificar unidad *</label>
                  <input className="input" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="Ej: porciones, hojas..." autoFocus />
                  {errors.unit && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.unit}</span>}
                </Field>
              )}
              <Field>
                <label className="label">Ubicación <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Estante 3, Cajón B..." />
              </Field>
            </div>

            <Field>
              <label className="label">Descripción <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Descripción breve del producto..." rows={2} style={{ resize: 'none' }} />
            </Field>

            {/* Sección preview */}
            {selectedSection && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '9px', background: `${selectedSection.color ?? '#415A77'}0f`, border: `1px solid ${selectedSection.color ?? '#415A77'}25` }}>
                <span style={{ fontSize: '18px' }}>{selectedSection.icon ?? '📁'}</span>
                <span style={{ fontSize: '13px', color: '#415A77', fontWeight: 500 }}>Sección: <strong>{selectedSection.name}</strong></span>
              </div>
            )}

            {/* Estado (solo editar) */}
            {isEdit && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>Producto activo</div>
                  <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>Los productos inactivos no aparecen en movimientos</div>
                </div>
                <button type="button" onClick={() => setIsActive(!isActive)}
                  style={{ width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: isActive ? '#415A77' : '#dde1e7', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', left: isActive ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Stock ── */}
        {tab === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Stock visual summary */}
            {isEdit && (
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { label: 'Stock actual', value: editProduct!.quantityCurrent, color: '#415A77' },
                  { label: 'Mínimo', value: editProduct!.quantityMinimum, color: '#b45309' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: '16px', borderRadius: '12px', background: '#f5f6f8', border: '1px solid #dde1e7', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field>
                <label className="label">Stock mínimo</label>
                <input className="input" type="number" min="0" value={qtyMin}
                  onChange={e => setQtyMin(e.target.value)} placeholder="0" />
                {errors.qtyMin && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.qtyMin}</span>}
                <span style={{ fontSize: '11.5px', color: '#778DA9' }}>Se generará alerta al llegar a este nivel</span>
              </Field>
              <Field>
                <label className="label">Stock máximo <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" type="number" min="0" value={qtyMax}
                  onChange={e => setQtyMax(e.target.value)} placeholder="Sin límite" />
                {errors.qtyMax && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.qtyMax}</span>}
              </Field>
            </div>

            {!isEdit && (
              <Field>
                <label className="label">Stock inicial <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" type="number" min="0" value={qtyInitial}
                  onChange={e => setQtyInitial(e.target.value)} placeholder="0" />
                <span style={{ fontSize: '11.5px', color: '#778DA9' }}>
                  Se registrará como una entrada inicial. Para agregar stock después, usa el módulo de Movimientos.
                </span>
              </Field>
            )}

            {/* Barra visual de stock si está editando */}
            {isEdit && Number(qtyMin) > 0 && (
              <div style={{ padding: '14px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#778DA9', marginBottom: '8px' }}>
                  <span>0</span>
                  <span style={{ color: '#b45309' }}>Mínimo: {qtyMin}</span>
                  {qtyMax && <span>{qtyMax}</span>}
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: '#dde1e7', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '999px',
                    background: editProduct!.quantityCurrent <= Number(qtyMin)
                      ? '#c53030'
                      : editProduct!.quantityCurrent <= Number(qtyMin) * 1.5
                        ? '#b45309' : '#415A77',
                    width: `${Math.min(100, (editProduct!.quantityCurrent / (Number(qtyMax) || editProduct!.quantityCurrent * 2)) * 100)}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Campos extra ── */}
        {tab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {loadingFields ? (
              [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '58px', borderRadius: '10px' }} />)
            ) : customFields.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚙️</div>
                <div className="empty-state-title">Sin campos extra</div>
                <div className="empty-state-text">Esta sección no tiene campos personalizados configurados</div>
              </div>
            ) : (
              customFields.map(f => (
                <DynamicField key={f.id} field={f}
                  value={fieldValues[f.id]}
                  error={errors[`field_${f.id}`]}
                  onChange={v => setFieldValues(prev => ({ ...prev, [f.id]: v }))}
                />
              ))
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}

/* ── Campo dinámico según tipo ── */
interface DynamicFieldProps {
  field: CustomField
  value: string | number | boolean | undefined
  error?: string
  onChange: (v: string | number | boolean) => void
}

function DynamicField({ field, value, error, onChange }: DynamicFieldProps) {
  const id = `field-${field.id}`

  return (
    <div className="form-group">
      <label className="label" htmlFor={id}>
        {field.name}
        {field.isRequired && <span style={{ color: '#c53030', marginLeft: '3px' }}>*</span>}
      </label>

      {field.fieldType === 'TEXT' && (
        <input id={id} className="input" value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? `Ingresa ${field.name.toLowerCase()}...`} />
      )}

      {field.fieldType === 'NUMBER' && (
        <input id={id} className="input" type="number" value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? '0'} />
      )}

      {field.fieldType === 'DATE' && (
        <input id={id} className="input" type="date" value={String(value ?? '')}
          onChange={e => onChange(e.target.value)} />
      )}

      {field.fieldType === 'BOOLEAN' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #dde1e7', background: '#fff', cursor: 'pointer' }}
          onClick={() => onChange(!value)}>
          <div style={{ width: '42px', height: '23px', borderRadius: '999px', background: value ? '#415A77' : '#dde1e7', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '2.5px', left: value ? '20px' : '2.5px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: '14px', color: value ? '#415A77' : '#778DA9', fontWeight: 500 }}>
            {value ? 'Sí' : 'No'}
          </span>
        </div>
      )}

      {field.fieldType === 'DROPDOWN' && (
        <select id={id} className="input" value={String(value ?? '')}
          onChange={e => onChange(e.target.value)} style={{ cursor: 'pointer' }}>
          <option value="">Seleccionar {field.name.toLowerCase()}...</option>
          {field.dropdownOptions?.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.helpText && (
        <span style={{ fontSize: '11.5px', color: '#778DA9' }}>{field.helpText}</span>
      )}
      {error && <span style={{ fontSize: '12px', color: '#c53030' }}>{error}</span>}
    </div>
  )
}
