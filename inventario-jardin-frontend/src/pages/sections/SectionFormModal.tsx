// =============================================================================
// src/pages/sections/SectionFormModal.tsx
// Modal para crear / editar secciones
// =============================================================================
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import Modal from '../../components/ui/Modal'
import { sectionsApi, type CreateSectionPayload } from '../../api/sections.api'
import { useToast } from '../../components/ui/Toast'
import type { Section } from '../../types'

interface SectionFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (section: Section) => void
  editSection?: Section | null
}

const ICONS = ['📦','🍎','🧹','🖊️','🎨','📚','🧪','🏃','🛁','🍽️','🌱','🧸','🎭','💊','🔧','📋','🧴','🎯','🏫','🌟']

const COLORS = [
  '#415A77','#778DA9','#2d6a4f','#52796f','#b5838d',
  '#e07a5f','#f2cc8f','#81b29a','#3d405b','#6b4226',
  '#9b5de5','#f15bb5','#00bbf9','#00f5d4','#fee440',
]

export default function SectionFormModal({ open, onClose, onSuccess, editSection }: SectionFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!editSection

  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [color,       setColor]       = useState('#415A77')
  const [icon,        setIcon]        = useState('📦')
  const [isActive,    setIsActive]    = useState(true)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (editSection) {
      setName(editSection.name)
      setDescription(editSection.description ?? '')
      setColor(editSection.color ?? '#415A77')
      setIcon(editSection.icon ?? '📦')
      setIsActive(editSection.isActive)
    } else {
      setName(''); setDescription(''); setColor('#415A77'); setIcon('📦'); setIsActive(true)
    }
    setErrors({})
  }, [editSection, open])

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'El nombre es requerido'
    if (name.trim().length < 2) e.name = 'Mínimo 2 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: CreateSectionPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      }
      let result: Section
      if (isEdit) {
        const res = await sectionsApi.update(editSection!.id, { ...payload, isActive })
        result = res.data.data!
        toast('success', 'Sección actualizada', `"${result.name}" fue actualizada`)
      } else {
        const res = await sectionsApi.create(payload)
        result = res.data.data!
        toast('success', 'Sección creada', `"${result.name}" fue creada exitosamente`)
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar sección' : 'Nueva sección'}
      subtitle={isEdit ? `Editando "${editSection?.name}"` : 'Define un área del jardín'}
      width={600}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner" />Guardando...</> : isEdit ? 'Guardar cambios' : 'Crear sección'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '16px 18px', borderRadius: '12px',
          background: `${color}12`, border: `1.5px solid ${color}30`,
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: `${color}25`, border: `2px solid ${color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '17px', fontWeight: 700, color: '#0D1B2A' }}>
              {name || 'Nombre de la sección'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#778DA9', marginTop: '3px' }}>
              {description || 'Descripción opcional'}
            </div>
          </div>
        </div>

        {/* Nombre */}
        <div className="form-group">
          <label className="label">Nombre *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Ej: Sala Cuna, Cocina, Bodega..." autoFocus />
          {errors.name && <span style={{ fontSize: '12px', color: '#c53030' }}>{errors.name}</span>}
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label className="label">Descripción <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Descripción breve del área..."
            rows={2} style={{ resize: 'none', lineHeight: 1.6 }} />
        </div>

        {/* Ícono */}
        <div className="form-group">
          <label className="label">Ícono</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ICONS.map(ic => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                style={{
                  width: '42px', height: '42px', borderRadius: '10px', fontSize: '20px',
                  border: `2px solid ${icon === ic ? '#415A77' : '#dde1e7'}`,
                  background: icon === ic ? '#edf1f6' : '#fff',
                  cursor: 'pointer', transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="form-group">
          <label className="label">Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: c, cursor: 'pointer',
                  border: color === c ? `3px solid #0D1B2A` : '3px solid transparent',
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  transition: 'all 0.12s',
                }} />
            ))}
          </div>
        </div>

        {/* Estado (solo editar) */}
        {isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: '#f5f6f8', border: '1px solid #dde1e7' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0D1B2A' }}>Sección activa</div>
              <div style={{ fontSize: '12px', color: '#778DA9', marginTop: '2px' }}>Las secciones inactivas no aparecen al crear productos</div>
            </div>
            <button type="button" onClick={() => setIsActive(!isActive)}
              style={{
                width: '46px', height: '26px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: isActive ? '#415A77' : '#dde1e7',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}>
              <span style={{
                position: 'absolute', top: '3px',
                left: isActive ? '22px' : '3px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}
