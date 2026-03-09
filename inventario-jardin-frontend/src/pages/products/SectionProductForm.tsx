// =============================================================================
// src/pages/products/SectionProductForm.tsx
// Formulario de producto específico por sección
// fieldValues usa formato { fieldId, value } — lo que el backend espera
// =============================================================================
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { productsApi, type CreateProductPayload, type FieldValuePayload } from '../../api/products.api'
import { useToast } from '../../components/ui/Toast'
import type { Section, CustomField, ProductFull } from '../../types'

const UNITS = ['unidades', 'cajas', 'bolsas', 'litros', 'kg', 'gramos', 'metros', 'paquetes', 'rollos', 'sets', 'pares']

interface Props {
  section: Section
  customFields: CustomField[]
  editProduct?: ProductFull | null
  onSuccess: (p: ProductFull) => void
  onCancel: () => void
}

function DynamicField({ field, value, error, onChange }: {
  field: CustomField
  value: string | number | boolean | undefined
  error?: string
  onChange: (v: string | number | boolean) => void
}) {
  return (
    <div className="form-group">
      <label className="label">
        {field.label || field.name}
        {field.isRequired && <span style={{ color: '#c53030', marginLeft: '3px' }}>*</span>}
      </label>
      {field.fieldType === 'TEXT' && (
        <input className="input" value={String(value ?? '')} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''} />
      )}
      {field.fieldType === 'NUMBER' && (
        <input className="input" type="number" value={String(value ?? '')} onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? '0'} />
      )}
      {field.fieldType === 'DATE' && (
        <input className="input" type="date" value={String(value ?? '')} onChange={e => onChange(e.target.value)} />
      )}
      {field.fieldType === 'BOOLEAN' && (
        <div onClick={() => onChange(!value)}
          style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px', borderRadius:'10px', border:'1.5px solid #dde1e7', background:'#fff', cursor:'pointer' }}>
          <div style={{ width:'42px', height:'23px', borderRadius:'999px', background: value ? '#415A77' : '#dde1e7', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:'2.5px', left: value ? '20px' : '2.5px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize:'14px', color: value ? '#415A77' : '#778DA9', fontWeight:500 }}>{value ? 'Sí' : 'No'}</span>
        </div>
      )}
      {field.fieldType === 'DROPDOWN' && (
        <select className="input" value={String(value ?? '')} onChange={e => onChange(e.target.value)} style={{ cursor:'pointer' }}>
          <option value="">Seleccionar...</option>
          {field.dropdownOptions?.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      )}
      {field.helpText && <span style={{ fontSize:'11.5px', color:'#778DA9' }}>{field.helpText}</span>}
      {error && <span style={{ fontSize:'12px', color:'#c53030' }}>{error}</span>}
    </div>
  )
}

export default function SectionProductForm({ section, customFields, editProduct, onSuccess, onCancel }: Props) {
  const { toast } = useToast()
  const isEdit    = !!editProduct
  const color     = section.color ?? '#415A77'

  const [name,        setName]        = useState('')
  const [code,        setCode]        = useState('')
  const [description, setDescription] = useState('')
  const [unit,        setUnit]        = useState('unidades')
  const [customUnit,  setCustomUnit]  = useState('')
  const [location,    setLocation]    = useState('')
  const [qtyMin,      setQtyMin]      = useState('0')
  const [qtyMax,      setQtyMax]      = useState('')
  const [qtyInitial,  setQtyInitial]  = useState('0')
  const [isActive,    setIsActive]    = useState(true)
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean>>({})
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name)
      setCode(editProduct.code ?? '')
      setDescription(editProduct.description ?? '')
      const known = UNITS.includes(editProduct.unit)
      setUnit(known ? editProduct.unit : 'otro')
      setCustomUnit(known ? '' : editProduct.unit)
      setLocation(editProduct.location ?? '')
      setQtyMin(String(editProduct.quantityMinimum))
      setQtyMax(editProduct.quantityMaximum != null ? String(editProduct.quantityMaximum) : '')
      setIsActive(editProduct.isActive)
      // Leer fieldValues del formato que devuelve el backend
      const fv: Record<string, string | number | boolean> = {}
      editProduct.fieldValues?.forEach(fval => {
        const type = fval.field?.fieldType
        if      (type === 'BOOLEAN')  fv[fval.fieldId] = fval.valueBoolean ?? false
        else if (type === 'NUMBER')   fv[fval.fieldId] = fval.valueNumber ?? ''
        else if (type === 'DROPDOWN') fv[fval.fieldId] = fval.valueOptionId ?? ''
        else if (type === 'DATE')     fv[fval.fieldId] = fval.valueDate ? String(fval.valueDate).slice(0,10) : ''
        else                          fv[fval.fieldId] = fval.valueText ?? ''
      })
      setFieldValues(fv)
    } else {
      setName(''); setCode(''); setDescription('')
      setUnit('unidades'); setCustomUnit(''); setLocation('')
      setQtyMin('0'); setQtyMax(''); setQtyInitial('0')
      setIsActive(true); setFieldValues({})
    }
    setErrors({})
  }, [editProduct])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'El nombre es requerido'
    if (unit === 'otro' && !customUnit.trim()) e.unit = 'Especifica la unidad'
    const min = Number(qtyMin), max = qtyMax !== '' ? Number(qtyMax) : null
    if (isNaN(min) || min < 0) e.qtyMin = 'Debe ser ≥ 0'
    if (max !== null && max < min) e.qtyMax = 'Debe ser mayor al mínimo'
    customFields.filter(f => f.isRequired).forEach(f => {
      const v = fieldValues[f.id]
      if (v === undefined || v === '' || v === null)
        e[`field_${f.id}`] = `"${f.label || f.name}" es obligatorio`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    const resolvedUnit = unit === 'otro' ? customUnit.trim() : unit
    // Formato correcto: { fieldId, value }
    const fvPayload: FieldValuePayload[] = customFields
      .map(f => {
        const raw = fieldValues[f.id]
        if (!f.isRequired && (raw === undefined || raw === '')) return null
        return { fieldId: f.id, value: raw ?? null } as FieldValuePayload
      })
      .filter((x): x is FieldValuePayload => x !== null)

    try {
      let result: ProductFull
      if (isEdit) {
        const res = await productsApi.update(editProduct!.id, {
          name: name.trim(), code: code.trim() || undefined,
          description: description.trim() || undefined,
          unit: resolvedUnit, location: location.trim() || undefined,
          quantityMinimum: Number(qtyMin),
          quantityMaximum: qtyMax !== '' ? Number(qtyMax) : undefined,
          isActive, fieldValues: fvPayload,
        })
        result = res.data.data!
        toast('success', 'Producto actualizado', `"${result.name}" actualizado`)
      } else {
        const payload: CreateProductPayload = {
          name: name.trim(), code: code.trim() || undefined,
          description: description.trim() || undefined,
          sectionId: section.id, unit: resolvedUnit,
          location: location.trim() || undefined,
          quantityMinimum: Number(qtyMin),
          quantityMaximum: qtyMax !== '' ? Number(qtyMax) : undefined,
          quantityInitial: Number(qtyInitial) || undefined,
          fieldValues: fvPayload,
        }
        const res = await productsApi.create(payload)
        result = res.data.data!
        toast('success', 'Producto creado', `"${result.name}" creado`)
      }
      onSuccess(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      toast('error', 'Error', msg)
    } finally {
      setLoading(false)
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'28px', alignItems:'start' }}>

      {/* ── Formulario ── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'28px' }}>
          <button onClick={onCancel} type="button"
            style={{ width:'34px', height:'34px', borderRadius:'9px', border:'1.5px solid #dde1e7', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:'#778DA9', flexShrink:0 }}>
            ←
          </button>
          <div>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#0D1B2A', margin:0 }}>
              {isEdit ? `Editar: ${editProduct?.name}` : `Nuevo producto · ${section.name}`}
            </h2>
            <p style={{ fontSize:'13px', color:'#778DA9', margin:'3px 0 0' }}>
              {isEdit ? 'Modifica los datos del producto' : 'Completa los campos y guarda'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Información */}
          <Section label="Información principal" color={color}>
            <div className="form-group">
              <label className="label">Nombre *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ej: Resmas A4, Jabón líquido..." autoFocus />
              {errors.name && <span style={{ fontSize:'12px', color:'#c53030' }}>{errors.name}</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div className="form-group">
                <label className="label">Código <small style={{ opacity:.5 }}>(opcional)</small></label>
                <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="PAP-001" />
              </div>
              <div className="form-group">
                <label className="label">Ubicación <small style={{ opacity:.5 }}>(opcional)</small></label>
                <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Estante 3..." />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div className="form-group">
                <label className="label">Unidad *</label>
                <select className="input" value={unit} onChange={e => setUnit(e.target.value)} style={{ cursor:'pointer' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="otro">Otra...</option>
                </select>
              </div>
              {unit === 'otro' && (
                <div className="form-group">
                  <label className="label">Especificar *</label>
                  <input className="input" value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="porciones..." />
                  {errors.unit && <span style={{ fontSize:'12px', color:'#c53030' }}>{errors.unit}</span>}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="label">Descripción <small style={{ opacity:.5 }}>(opcional)</small></label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
                rows={2} style={{ resize:'none' }} placeholder="Descripción breve..." />
            </div>
          </Section>

          {/* Stock */}
          <Section label="Stock" color={color}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
              <div className="form-group">
                <label className="label">Stock mínimo</label>
                <input className="input" type="number" min="0" value={qtyMin} onChange={e => setQtyMin(e.target.value)} />
                {errors.qtyMin && <span style={{ fontSize:'12px', color:'#c53030' }}>{errors.qtyMin}</span>}
                <span style={{ fontSize:'11.5px', color:'#778DA9' }}>Genera alerta automática</span>
              </div>
              <div className="form-group">
                <label className="label">Stock máximo <small style={{ opacity:.5 }}>(opcional)</small></label>
                <input className="input" type="number" min="0" value={qtyMax} onChange={e => setQtyMax(e.target.value)} placeholder="Sin límite" />
                {errors.qtyMax && <span style={{ fontSize:'12px', color:'#c53030' }}>{errors.qtyMax}</span>}
              </div>
              {!isEdit && (
                <div className="form-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="label">Stock inicial <small style={{ opacity:.5 }}>(opcional)</small></label>
                  <input className="input" type="number" min="0" value={qtyInitial} onChange={e => setQtyInitial(e.target.value)} placeholder="0" />
                  <span style={{ fontSize:'11.5px', color:'#778DA9' }}>Se registra como entrada inicial. Más stock → Movimientos.</span>
                </div>
              )}
            </div>
          </Section>

          {/* Campos personalizados */}
          {customFields.length > 0 && (
            <Section label={`Campos de ${section.name}`} color={color}>
              {customFields.map(f => (
                <DynamicField key={f.id} field={f}
                  value={fieldValues[f.id]}
                  error={errors[`field_${f.id}`]}
                  onChange={v => setFieldValues(prev => ({ ...prev, [f.id]: v }))}
                />
              ))}
            </Section>
          )}

          {/* Estado — solo edición */}
          {isEdit && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 15px', borderRadius:'10px', background:'#f5f6f8', border:'1px solid #dde1e7', marginBottom:'24px' }}>
              <div>
                <div style={{ fontSize:'13.5px', fontWeight:600, color:'#0D1B2A' }}>Producto activo</div>
                <div style={{ fontSize:'12px', color:'#778DA9', marginTop:'2px' }}>Los inactivos no aparecen en movimientos</div>
              </div>
              <button type="button" onClick={() => setIsActive(!isActive)}
                style={{ width:'44px', height:'24px', borderRadius:'999px', border:'none', cursor:'pointer', background: isActive ? '#415A77' : '#dde1e7', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <span style={{ position:'absolute', top:'3px', left: isActive ? '22px' : '3px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          )}

          {hasErrors && (
            <div style={{ padding:'12px 14px', borderRadius:'10px', background:'#fff5f5', border:'1px solid #fca5a5', marginBottom:'20px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#c53030', marginBottom:'4px' }}>Corrige los siguientes campos:</div>
              {Object.values(errors).map((e, i) => <div key={i} style={{ fontSize:'12.5px', color:'#c53030' }}>· {e}</div>)}
            </div>
          )}

          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', paddingBottom:'32px' }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" />Guardando...</> : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Panel lateral ── */}
      <div style={{ position:'sticky', top:'24px', display:'flex', flexDirection:'column', gap:'12px' }}>
        <div className="card" style={{ padding:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:`${color}18`, border:`2px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
              {section.icon ?? '📁'}
            </div>
            <div>
              <div style={{ fontFamily:'Fraunces, serif', fontSize:'14px', fontWeight:700, color:'#0D1B2A' }}>{section.name}</div>
              {section.description && <div style={{ fontSize:'12px', color:'#778DA9' }}>{section.description}</div>}
            </div>
          </div>
          {customFields.length > 0 ? (
            <>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#778DA9', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Campos adicionales</div>
              {customFields.map(f => {
                const icons: Record<string, string> = { TEXT:'✎', NUMBER:'#', DATE:'📅', BOOLEAN:'☑', DROPDOWN:'▾' }
                const lbls:  Record<string, string> = { TEXT:'Texto', NUMBER:'Número', DATE:'Fecha', BOOLEAN:'Sí/No', DROPDOWN:'Lista' }
                return (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', borderRadius:'8px', background:'#f5f6f8', marginBottom:'5px' }}>
                    <span style={{ fontSize:'11px', color, fontWeight:700, width:'14px', textAlign:'center' }}>{icons[f.fieldType]}</span>
                    <span style={{ fontSize:'12.5px', fontWeight:600, color:'#0D1B2A', flex:1 }}>{f.label || f.name}</span>
                    <span style={{ fontSize:'11px', color:'#9db5c8' }}>{lbls[f.fieldType]}</span>
                    {f.isRequired && <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'999px', background:'#fee2e2', color:'#c53030', fontWeight:700 }}>req.</span>}
                  </div>
                )
              })}
            </>
          ) : (
            <div style={{ fontSize:'12.5px', color:'#9db5c8', fontStyle:'italic' }}>Sin campos adicionales</div>
          )}
        </div>
        <div style={{ padding:'12px 14px', borderRadius:'10px', background:'#f5f6f8', border:'1px solid #dde1e7', fontSize:'11.5px', color:'#778DA9', lineHeight:1.6 }}>
          💡 Campos con <span style={{ color:'#c53030', fontWeight:700 }}>*</span> son obligatorios. El stock se ajusta desde <strong>Movimientos</strong>.
        </div>
      </div>
    </div>
  )
}

// Helper interno para secciones del formulario
function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:'28px' }}>
      <div style={{ fontSize:'11px', fontWeight:800, color:'#778DA9', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ display:'inline-block', width:'20px', height:'2px', background:color, borderRadius:'999px' }} />
        {label}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>{children}</div>
    </div>
  )
}
