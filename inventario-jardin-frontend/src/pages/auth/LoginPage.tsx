// =============================================================================
// src/pages/auth/LoginPage.tsx
// Panel izquierdo completamente configurable desde Ajustes del sistema
// =============================================================================
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest } from '../../api/auth.api'
import { useAuthStore } from '../../store/auth.store'
import { useSettingsStore } from '../../store/settings.store'

export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const { config, fetch: fetchSettings } = useSettingsStore()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Cargar config al abrir el login — llamada directa, una sola vez
  useEffect(() => {
    // Solo cargar si el store no tiene datos todavía
    fetchSettings()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Parsear features — con fallback si el JSON es inválido
  let features: string[] = []
  try {
    const parsed = JSON.parse(config.login_features || '[]')
    features = Array.isArray(parsed) ? parsed : []
  } catch {
    features = ['Múltiples secciones','Control de stock','Alertas automáticas','Roles y permisos']
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await loginRequest({ email, password })
      const { user, accessToken, refreshToken } = res.data.data!
      login(user, accessToken, refreshToken)
      navigate('/dashboard')
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Credenciales incorrectas')
    } finally { setLoading(false) }
  }

  const primary = config.primary_color || '#1B263B'
  const accent  = config.accent_color  || '#415A77'

  return (
    <>
      <style>{`
        .login-input { width:100%; padding:11px 14px; border:1.5px solid #dde1e7; border-radius:10px; font-family:inherit; font-size:14px; color:#0D1B2A; background:#fff; outline:none; transition:border-color 0.15s,box-shadow 0.15s; letter-spacing:-0.01em; box-sizing:border-box; }
        .login-input:focus { border-color:${accent}; box-shadow:0 0 0 3px ${accent}20; }
        .login-input::placeholder { color:#778DA9; }
        .show-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#778DA9; font-size:15px; padding:4px; display:flex; align-items:center; transition:color 0.15s; }
        .show-btn:hover { color:${accent}; }
        @media (max-width:768px) { .login-left { display:none !important; } }
      `}</style>

      <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', background:'#f0f2f5' }}>

        {/* ── Panel izquierdo — configurable ── */}
        <div className="login-left" style={{
          position:'relative', overflow:'hidden',
          background:`linear-gradient(160deg, ${primary} 0%, ${primary}ee 55%, ${accent} 100%)`,
          display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'52px',
        }}>
          {/* Textura */}
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.05, pointerEvents:'none' }}>
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E0E1DD" strokeWidth="0.8"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
          <div style={{ position:'absolute', top:'-100px', right:'-100px', width:'400px', height:'400px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-60px', left:'-40px', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)', pointerEvents:'none' }} />

          {/* Logo/nombre */}
          <div className="anim-fade-up" style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'14px', background:'rgba(224,225,221,0.08)', border:'1px solid rgba(224,225,221,0.15)', borderRadius:'14px', padding:'12px 20px', backdropFilter:'blur(8px)' }}>
              {config.app_logo_url ? (
                <img src={config.app_logo_url} alt="logo"
                  style={{ width:'38px', height:'38px', borderRadius:'10px', objectFit:'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
              ) : (
                <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`${accent}88`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', color:'#fff', fontFamily:'Fraunces,serif', fontWeight:800 }}>
                  {(config.app_name || 'I')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontFamily:'Fraunces,serif', fontSize:'15px', fontWeight:700, color:'#E0E1DD', letterSpacing:'-0.01em' }}>
                  {config.app_name || 'Mi Institución'}
                </div>
                {config.app_slogan && (
                  <div style={{ fontSize:'11px', color:'rgba(224,225,221,0.45)', marginTop:'1px' }}>
                    {config.app_slogan}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Texto central */}
          <div className="anim-fade-up d-200" style={{ position:'relative', zIndex:1 }}>
            <h1 style={{ fontFamily:'Fraunces,serif', fontSize:'52px', fontWeight:700, color:'#E0E1DD', lineHeight:1.1, letterSpacing:'-0.03em', marginBottom:'22px' }}>
              {config.login_title || 'Gestión simple.'}
              {config.login_subtitle && (
                <><br/><em style={{ color:'rgba(224,225,221,0.55)', fontStyle:'italic' }}>{config.login_subtitle}</em></>
              )}
            </h1>
            {config.login_description && (
              <p style={{ fontSize:'15px', color:'rgba(224,225,221,0.5)', lineHeight:1.8, maxWidth:'340px' }}>
                {config.login_description}
              </p>
            )}
            {features.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', marginTop:'32px' }}>
                {features.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'6px 14px', borderRadius:'999px', background:'rgba(224,225,221,0.07)', border:'1px solid rgba(224,225,221,0.1)' }}>
                    <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:`${accent}cc`, display:'inline-block' }} />
                    <span style={{ fontSize:'12px', color:'rgba(224,225,221,0.65)', fontWeight:500 }}>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ position:'relative', zIndex:1, fontSize:'11.5px', color:'rgba(224,225,221,0.25)' }}>
            © {new Date().getFullYear()} · {config.login_footer || 'Sistema de Inventario'}
          </div>
        </div>

        {/* ── Panel derecho: formulario (sin cambios) ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'48px', background:'#f0f2f5' }}>
          <div className="anim-scale-in" style={{ width:'100%', maxWidth:'400px' }}>
            <div style={{ background:'#fff', borderRadius:'20px', border:'1px solid #dde1e7', boxShadow:'0 8px 32px rgba(13,27,42,0.08), 0 2px 8px rgba(13,27,42,0.05)', padding:'40px' }}>
              <div style={{ marginBottom:'32px' }}>
                <h2 style={{ fontFamily:'Fraunces,serif', fontSize:'28px', fontWeight:700, color:'#0D1B2A', letterSpacing:'-0.02em', margin:'0 0 8px 0', lineHeight:1.2 }}>
                  Iniciar sesión
                </h2>
                <p style={{ fontSize:'14px', color:'#778DA9' }}>Ingresa tus credenciales de acceso</p>
              </div>
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:accent, marginBottom:'7px', letterSpacing:'0.04em', textTransform:'uppercase' }}>Correo electrónico</label>
                  <input type="email" className="login-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required autoFocus autoComplete="email"/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:accent, marginBottom:'7px', letterSpacing:'0.04em', textTransform:'uppercase' }}>Contraseña</label>
                  <div style={{ position:'relative' }}>
                    <input type={showPass ? 'text' : 'password'} className="login-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={{ paddingRight:'42px' }}/>
                    <button type="button" className="show-btn" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                {error && (
                  <div className="alert alert-error anim-fade-in">
                    <span style={{ fontSize:'16px', flexShrink:0 }}>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}
                  style={{ marginTop:'4px', background:primary, boxShadow:`0 4px 14px ${primary}44` }}>
                  {loading ? <><span className="spinner"/> Verificando...</> : 'Ingresar →'}
                </button>
              </form>
            </div>
            <div style={{ marginTop:'16px', padding:'14px 18px', borderRadius:'12px', background:`${accent}12`, border:`1px solid ${accent}20` }}>
              <p style={{ fontSize:'11px', fontWeight:700, color:accent, marginBottom:'6px', letterSpacing:'0.08em', textTransform:'uppercase' }}>Acceso de prueba</p>
              <p style={{ fontSize:'12.5px', color:'#778DA9', fontFamily:'monospace', lineHeight:1.9 }}>
                admin@jardin.com<br/>Admin123*
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
