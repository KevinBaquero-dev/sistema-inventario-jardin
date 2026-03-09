// =============================================================================
// src/pages/settings/SettingsPage.tsx  — Solo ADMIN
// Configuración del sistema: datos generales + tema
// =============================================================================
import { useState, useEffect } from 'react'
import { settingsApi, type UpdateSettingsPayload } from '../../api/settings.api'
import { useSettingsStore } from '../../store/settings.store'
import { useToast } from '../../components/ui/Toast'

const DEFAULT_COLORS = ['#1B263B','#2d3748','#1a365d','#276749','#744210','#553c9a','#97266d','#c53030']

export default function SettingsPage() {
  const { config, update: updateStore } = useSettingsStore()
  const { toast } = useToast()

  const [appName,      setAppName]      = useState('')
  const [appSlogan,    setAppSlogan]    = useState('')
  const [appLogoUrl,   setAppLogoUrl]   = useState('')
  const [primaryColor,     setPrimaryColor]     = useState('')
  const [accentColor,      setAccentColor]      = useState('')
  const [loginTitle,       setLoginTitle]       = useState('')
  const [loginSubtitle,    setLoginSubtitle]    = useState('')
  const [loginDescription, setLoginDescription] = useState('')
  const [loginFeatures,    setLoginFeatures]    = useState('')
  const [loginFooter,      setLoginFooter]      = useState('')
  const [loading,          setLoading]          = useState(false)
  const [saved,            setSaved]            = useState(false)

  // Prellenar desde el store (que ya cargó la config)
  useEffect(() => {
    setAppName(config.app_name || '')
    setAppSlogan(config.app_slogan || '')
    setAppLogoUrl(config.app_logo_url || '')
    setPrimaryColor(config.primary_color || '#1B263B')
    setAccentColor(config.accent_color || '#415A77')
    setLoginTitle(config.login_title || '')
    setLoginSubtitle(config.login_subtitle || '')
    setLoginDescription(config.login_description || '')
    // Convertir JSON array a texto separado por comas para edición simple
    try {
      const arr = JSON.parse(config.login_features || '[]')
      setLoginFeatures(Array.isArray(arr) ? arr.join(', ') : '')
    } catch { setLoginFeatures('') }
    setLoginFooter(config.login_footer || '')
  }, [config])

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    try {
      // Convertir lista de features (texto) de vuelta a JSON array
      const featuresArr = loginFeatures.split(',').map(s => s.trim()).filter(Boolean)

      const payload: UpdateSettingsPayload = {
        app_name:          appName.trim(),
        app_slogan:        appSlogan.trim(),
        app_logo_url:      appLogoUrl.trim(),
        primary_color:     primaryColor,
        accent_color:      accentColor,
        login_title:       loginTitle.trim(),
        login_subtitle:    loginSubtitle.trim(),
        login_description: loginDescription.trim(),
        login_features:    JSON.stringify(featuresArr),
        login_footer:      loginFooter.trim(),
      }
      const res = await settingsApi.update(payload)
      // Actualizar el store global para que el sidebar refleje los cambios inmediatamente
      updateStore(res.data.data!)
      setSaved(true)
      toast('success', 'Ajustes guardados', 'La configuración fue actualizada')
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      toast('error', 'Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Datos generales ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
            Datos generales
          </h3>
          <p style={{ fontSize: 13, color: '#778DA9', margin: '4px 0 0' }}>
            Información que aparece en el sidebar y cabecera del sistema
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="label">Nombre de la institución</label>
            <input className="input" value={appName} onChange={e => setAppName(e.target.value)}
              placeholder="Ej: Colegio San José" />
          </div>
          <div className="form-group">
            <label className="label">Eslogan / subtítulo <span style={{ opacity: .5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <input className="input" value={appSlogan} onChange={e => setAppSlogan(e.target.value)}
              placeholder="Ej: Excelencia y Valores" />
          </div>
          <div className="form-group">
            <label className="label">URL del logo <span style={{ opacity: .5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <input className="input" value={appLogoUrl} onChange={e => setAppLogoUrl(e.target.value)}
              placeholder="https://..." />
            <span style={{ fontSize: 11.5, color: '#778DA9' }}>
              Ingresa la URL de una imagen hospedada. Si está vacío, se muestra la inicial del nombre.
            </span>
            {appLogoUrl && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={appLogoUrl} alt="preview" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #dde1e7' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontSize: 12, color: '#778DA9' }}>Vista previa del logo</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tema ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
            Tema del sistema
          </h3>
          <p style={{ fontSize: 13, color: '#778DA9', margin: '4px 0 0' }}>
            Colores utilizados en el sidebar y elementos de acento
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Color primario */}
          <div className="form-group">
            <label className="label">Color primario</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: primaryColor, border: '2px solid #dde1e7', flexShrink: 0 }} />
              <input className="input" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                placeholder="#1B263B" style={{ fontFamily: 'monospace', fontSize: 13 }} />
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #dde1e7', cursor: 'pointer', padding: 2, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEFAULT_COLORS.map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)}
                  style={{ width: 22, height: 22, borderRadius: 5, background: c, border: c === primaryColor ? '2px solid #415A77' : '2px solid transparent', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }} />
              ))}
            </div>
          </div>

          {/* Color acento */}
          <div className="form-group">
            <label className="label">Color de acento</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: accentColor, border: '2px solid #dde1e7', flexShrink: 0 }} />
              <input className="input" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                placeholder="#415A77" style={{ fontFamily: 'monospace', fontSize: 13 }} />
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #dde1e7', cursor: 'pointer', padding: 2, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEFAULT_COLORS.map(c => (
                <button key={c} onClick={() => setAccentColor(c)}
                  style={{ width: 22, height: 22, borderRadius: 5, background: c, border: c === accentColor ? '2px solid #415A77' : '2px solid transparent', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Vista previa del sidebar */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: '#f5f6f8', border: '1px solid #dde1e7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#778DA9', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Vista previa
          </div>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 80, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 100, background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: accentColor, flexShrink: 0 }} />
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appName || 'Mi Institución'}</div>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
              {['Dashboard', 'Movimientos', 'Secciones'].map(item => (
                <div key={item} style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', padding: '2px 4px' }}>{item}</div>
              ))}
            </div>
            <div style={{ flex: 1, background: '#f0f2f5', padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>Dashboard</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[primaryColor, accentColor, '#e8edf3'].map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 24, borderRadius: 5, background: c, opacity: i === 2 ? 1 : 0.8 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pantalla de login ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: '#0D1B2A', margin: 0 }}>
            Pantalla de login
          </h3>
          <p style={{ fontSize: 13, color: '#778DA9', margin: '4px 0 0' }}>
            Textos del panel izquierdo que ven los usuarios al ingresar al sistema
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="label">Título principal</label>
              <input className="input" value={loginTitle} onChange={e => setLoginTitle(e.target.value)}
                placeholder="Ej: Gestión simple." />
            </div>
            <div className="form-group">
              <label className="label">Subtítulo <small style={{ opacity:.5 }}>(línea cursiva)</small></label>
              <input className="input" value={loginSubtitle} onChange={e => setLoginSubtitle(e.target.value)}
                placeholder="Ej: Control total." />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Descripción</label>
            <textarea className="input" value={loginDescription} onChange={e => setLoginDescription(e.target.value)}
              rows={2} style={{ resize: 'none' }}
              placeholder="Breve descripción del sistema..." />
          </div>

          <div className="form-group">
            <label className="label">Pills de características</label>
            <input className="input" value={loginFeatures} onChange={e => setLoginFeatures(e.target.value)}
              placeholder="Múltiples secciones, Control de stock, Alertas automáticas" />
            <span style={{ fontSize: 11.5, color: '#778DA9' }}>
              Separa cada característica con una coma. Máximo recomendado: 4 ítems.
            </span>
          </div>

          <div className="form-group">
            <label className="label">Pie de página <small style={{ opacity:.5 }}>(aparece abajo a la izquierda)</small></label>
            <input className="input" value={loginFooter} onChange={e => setLoginFooter(e.target.value)}
              placeholder="Ej: Sistema de Inventario Jardín Infantil" />
            <span style={{ fontSize: 11.5, color: '#778DA9' }}>
              Se mostrará como "© {new Date().getFullYear()} · {loginFooter || 'Sistema de Inventario'}"
            </span>
          </div>
        </div>

        {/* Vista previa mini */}
        {(loginTitle || loginSubtitle) && (
          <div style={{ marginTop: 20, padding: 20, borderRadius: 12, background: `linear-gradient(135deg, ${primaryColor || '#1B263B'}, ${accentColor || '#415A77'})`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position:'absolute', inset:0, opacity:.04 }}>
              <svg width="100%" height="100%"><defs><pattern id="pg" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fff" strokeWidth="0.6"/></pattern></defs><rect width="100%" height="100%" fill="url(#pg)"/></svg>
            </div>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontFamily:'Fraunces, serif', fontSize: 22, fontWeight: 700, color: '#E0E1DD', lineHeight: 1.2, marginBottom: 8 }}>
                {loginTitle || 'Título'}
                {loginSubtitle && <><br/><em style={{ color:'rgba(224,225,221,0.55)', fontStyle:'italic', fontSize:20 }}>{loginSubtitle}</em></>}
              </div>
              {loginDescription && (
                <p style={{ fontSize: 12, color: 'rgba(224,225,221,0.5)', margin:'8px 0', lineHeight:1.6, maxWidth: 300 }}>
                  {loginDescription}
                </p>
              )}
              {loginFeatures && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                  {loginFeatures.split(',').map(f => f.trim()).filter(Boolean).map((f, i) => (
                    <span key={i} style={{ fontSize:10, padding:'3px 10px', borderRadius:999, background:'rgba(224,225,221,0.08)', border:'1px solid rgba(224,225,221,0.12)', color:'rgba(224,225,221,0.6)' }}>
                      · {f}
                    </span>
                  ))}
                </div>
              )}
              {loginFooter && (
                <div style={{ marginTop:12, fontSize:10, color:'rgba(224,225,221,0.25)' }}>
                  © {new Date().getFullYear()} · {loginFooter}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#166534', padding: '8px 14px', borderRadius: 8, background: '#dcfce7', border: '1px solid #86efac' }}>
            ✓ Cambios guardados
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <><span className="spinner" />Guardando...</> : 'Guardar ajustes'}
        </button>
      </div>
    </div>
  )
}
