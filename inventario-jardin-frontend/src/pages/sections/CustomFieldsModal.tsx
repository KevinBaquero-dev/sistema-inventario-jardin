// =============================================================================
// src/pages/sections/CustomFieldsModal.tsx
// Gestión de campos personalizados de una sección
// =============================================================================
import { useState, useEffect } from 'react'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { sectionsApi, type CreateFieldPayload } from '../../api/sections.api'
import { useToast } from '../../components/ui/Toast'
import type { Section, CustomField, FieldType } from '../../types'

const FIELD_TYPES: { value: FieldType; label: string; icon: string; desc: string }[] = [
  { value: 'TEXT',     label: 'Texto',     icon: '✎',  desc: 'Cualquier texto libre' },
  { value: 'NUMBER',   label: 'Número',    icon: '#',  desc: 'Valores numéricos' },
  { value: 'DATE',     label: 'Fecha',     icon: '📅', desc: 'Fecha del calendario' },
  { value: 'BOOLEAN',  label: 'Sí / No',   icon: '☑', desc: 'Casilla verdadero/falso' },
  { value: 'DROPDOWN', label: 'Lista',     icon: '▾',  desc: 'Opciones predefinidas' },
]

interface CustomFieldsModalProps {
  open: boolean
  onClose: () => void
  section: Section | null
}

/* ── Empty form state ── */
function emptyForm() {
  return {
    name: '',
    fieldType: 'TEXT' as FieldType,
    isRequired: false,
    placeholder: '',
    helpText: '',
    options: [{ label: '', value: '' }],
  }
}

export default function CustomFieldsModal({ open, onClose, section }: CustomFieldsModalProps) {
  const { toast } = useToast()
  const [fields,       setFields]      = useState<CustomField[]>([])
  const [loading,      setLoading]     = useState(false)
  const [saving,       setSaving]      = useState(false)
  const [showForm,     setShowForm]    = useState(false)
  const [editField,    setEditField]   = useState<CustomField | null>(null)
  const [deleteField,  setDeleteField] = useState<CustomField | null>(null)
  const [deleting,     setDeleting]    = useState(false)
  const [form,         setForm]        = useState(emptyForm())
  const [errors,       setErrors]      = useState<Record<string, string>>({})

  /* Cargar campos */
  useEffect(() => {
    if (!open || !section) return
    setShowForm(false)
    setLoading(true)
    sectionsApi.getFields(section.id)
      .then(res => setFields(res.data.data ?? []))
      .catch(() => toast('error', 'Error', 'No se pudieron cargar los campos'))
      .finally(() => setLoading(false))
  }, [open, section, toast])

  /* Prellenar edición */
  function startEdit(f: CustomField) {
    setEditField(f)
    setForm({
      name: f.name,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      placeholder: f.placeholder ?? '',
      helpText: f.helpText ?? '',
      options: f.dropdownOptions?.length
        ? f.dropdownOptions.map(o => ({ label: o.label, value: o.value }))
        : [{ label: '', value: '' }],
    })
    setErrors({})
    setShowForm(true)
  }

  function startCreate() {
    setEditField(null)
    setForm(emptyForm())
    setErrors({})
    setShowForm(true)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nombre requerido'
    if (form.fieldType === 'DROPDOWN') {
      const valid = form.options.filter(o => o.label.trim())
      if (valid.length < 1) e.options = 'Agrega al menos una opción'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate() || !section) return
    setSaving(true)
    try {
      const payload: CreateFieldPayload = {
        name: form.name.trim(),
        label: form.name.trim(),   // El backend requiere label; usamos el mismo valor que name
        fieldType: form.fieldType,
        isRequired: form.isRequired,
        placeholder: form.placeholder.trim() || undefined,
        helpText: form.helpText.trim() || undefined,
        dropdownOptions: form.fieldType === 'DROPDOWN'
          ? form.options.filter(o => o.label.trim()).map((o, i) => ({
              label: o.label.trim(),
              value: o.value.trim() || o.label.trim().toLowerCase().replace(/\s+/g, '_'),
              displayOrder: i,
            }))
          : undefined,
      }
      let result: CustomField
      if (editField) {
        const res = await sectionsApi.updateField(section.id, editField.id, payload)
        result = res.data.data!
        setFields(prev => prev.map(f => f.id === result.id ? result : f))
        toast('success', 'Campo actualizado')
      } else {
        const res = await sectionsApi.createField(section.id, payload)
        result = res.data.data!
        setFields(prev => [...prev, result])
        toast('success', 'Campo creado', `"${result.name}" fue agregado`)
      }
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      toast('error', 'Error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteField || !section) return
    setDeleting(true)
    try {
      await sectionsApi.deleteField(section.id, deleteField.id)
      setFields(prev => prev.filter(f => f.id !== deleteField.id))
      toast('success', 'Campo eliminado')
      setDeleteField(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al eliminar'
      toast('error', 'Error', msg)
    } finally {
      setDeleting(false)
    }
  }

  const typeIcon: Record<FieldType, string> = { TEXT:'✎', NUMBER:'#', DATE:'📅', BOOLEAN:'☑', DROPDOWN:'▾' }

  return (
    <>
      <ConfirmDialog
        open={!!deleteField} onClose={() => setDeleteField(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Eliminar campo"
        message={`¿Eliminar el campo "${deleteField?.name}"? Se perderán todos los valores guardados en los productos.`}
      />

      <Modal
        open={open} onClose={onClose}
        title={`Campos de "${section?.name}"`}
        subtitle="Define atributos adicionales para los productos de esta sección"
        width={680}
        footer={
          showForm ? (
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" />Guardando...</> : editField ? 'Guardar cambios' : 'Agregar campo'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={startCreate}>+ Agregar campo</button>
          )
        }
      >
        {/* ── Lista de campos ── */}
        {!showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: '62px', borderRadius: '10px' }} />
              ))
            ) : fields.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 24px' }}>
                <div className="empty-state-icon">⚙️</div>
                <div className="empty-state-title">Sin campos personalizados</div>
                <div className="empty-state-text">
                  Agrega atributos específicos para los productos de esta sección,<br/>
                  como fecha de vencimiento, proveedor o categoría.
                </div>
              </div>
            ) : (
              fields.map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px',
                  background: '#f5f6f8', border: '1px solid #dde1e7',
                }}>
                  {/* Type badge */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
                    background: '#edf1f6', border: '1.5px solid #c8cdd6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontFamily: 'monospace', color: '#415A77', fontWeight: 700,
                  }}>
                    {typeIcon[f.fieldType]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>{f.name}</span>
                      {f.isRequired && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: '#fee2e2', color: '#c53030', fontWeight: 700 }}>Requerido</span>
                      )}
                      {!f.isActive && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: '#f5f6f8', color: '#778DA9', fontWeight: 700 }}>Inactivo</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>
                      {FIELD_TYPES.find(t => t.value === f.fieldType)?.label}
                      {f.fieldType === 'DROPDOWN' && f.dropdownOptions?.length
                        ? ` · ${f.dropdownOptions.length} opciones`
                        : ''}
                      {f.placeholder ? ` · "${f.placeholder}"` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(f)} title="Editar">✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteField(f)} title="Eliminar" style={{ color: '#c53030' }}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Formulario de campo ── */}
        {showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Nombre */}
            <div className="form-group">
              <label className="label">Nombre del campo *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Fecha de vencimiento, Proveedor, Categoría..." autoFocus />
              {errors.name && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.name}</span>}
            </div>

            {/* Tipo */}
            <div className="form-group">
              <label className="label">Tipo de campo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {FIELD_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, fieldType: t.value }))}
                    title={t.desc}
                    style={{
                      padding: '10px 6px', borderRadius: '10px', cursor: 'pointer',
                      border: `1.5px solid ${form.fieldType === t.value ? '#415A77' : '#dde1e7'}`,
                      background: form.fieldType === t.value ? '#edf1f6' : '#fff',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                      transition: 'all 0.12s',
                    }}>
                    <span style={{ fontSize: '18px', fontFamily: 'monospace', color: form.fieldType === t.value ? '#415A77' : '#778DA9' }}>{t.icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: form.fieldType === t.value ? 700 : 500, color: form.fieldType === t.value ? '#415A77' : '#778DA9' }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones dropdown */}
            {form.fieldType === 'DROPDOWN' && (
              <div className="form-group">
                <label className="label">Opciones de la lista *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input className="input" value={opt.label}
                        onChange={e => {
                          const next = [...form.options]
                          next[i] = { ...next[i], label: e.target.value }
                          setForm(f => ({ ...f, options: next }))
                        }}
                        placeholder={`Opción ${i + 1}`}
                        style={{ flex: 1 }}
                      />
                      {form.options.length > 1 && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c53030', fontSize: '16px', padding: '4px', flexShrink: 0 }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {errors.options && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.options}</span>}
                  <button type="button" onClick={() => setForm(f => ({ ...f, options: [...f.options, { label: '', value: '' }] }))}
                    className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                    + Agregar opción
                  </button>
                </div>
              </div>
            )}

            {/* Placeholder */}
            {form.fieldType !== 'BOOLEAN' && form.fieldType !== 'DROPDOWN' && (
              <div className="form-group">
                <label className="label">Texto de ayuda en el campo <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input className="input" value={form.placeholder}
                  onChange={e => setForm(f => ({ ...f, placeholder: e.target.value }))}
                  placeholder="Ej: Ingresa la fecha de vencimiento..." />
              </div>
            )}

            {/* Requerido */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>Campo obligatorio</div>
                <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>Si está activo, el campo es requerido al crear un producto</div>
              </div>
              <button type="button" onClick={() => setForm(f => ({ ...f, isRequired: !f.isRequired }))}
                style={{
                  width: '44px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  background: form.isRequired ? '#415A77' : '#dde1e7', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                <span style={{
                  position: 'absolute', top: '3px', left: form.isRequired ? '22px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
