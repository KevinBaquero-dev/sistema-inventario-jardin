// =============================================================================
// src/components/layout/AppLayout.tsx
// Sidebar dinámico: logo del sistema + secciones desde la API
// =============================================================================
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useSettingsStore } from '../../store/settings.store'
import { sectionsApi } from '../../api/sections.api'
import { logoutRequest } from '../../api/auth.api'
import type { Section } from '../../types'

const roleConfig: Record<string, { label: string; bg: string; color: string }> = {
  ADMIN:       { label: 'Administrador', bg: '#e8edf3', color: '#1B263B' },
  COORDINATOR: { label: 'Coordinadora',  bg: '#eff4ff', color: '#1d4ed8' },
  ASSISTANT:   { label: 'Asistente',     bg: '#f0f2f5', color: '#415A77' },
}

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard',    subtitle: 'Resumen general del sistema' },
  '/sections':  { title: 'Secciones',    subtitle: 'Gestiona las áreas del jardín' },
  '/products':  { title: 'Productos',    subtitle: 'Inventario de materiales e insumos' },
  '/reports': { title: 'Movimientos',  subtitle: 'Entradas, salidas y transferencias' },
  '/users':     { title: 'Usuarios',     subtitle: 'Administración de accesos' },
  '/settings':  { title: 'Ajustes',      subtitle: 'Configuración del sistema' },
}

export default function AppLayout() {
  const { user, logout, refreshToken } = useAuthStore()
  const { config, fetch: fetchSettings } = useSettingsStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [collapsed,    setCollapsed]    = useState(false)
  const [loggingOut,   setLoggingOut]   = useState(false)
  const [sections,     setSections]     = useState<Section[]>([])
  const [sectionsOpen, setSectionsOpen] = useState(true)

  const role     = roleConfig[user?.role ?? ''] ?? roleConfig.ASSISTANT
  const initials = user?.fullName?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'U'
  const isAdmin  = user?.role === 'ADMIN'

  useEffect(() => {
    fetchSettings()
    sectionsApi.getAll()
      .then(res => setSections(res.data.data ?? []))
      .catch(() => {})
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const metaKey = Object.keys(pageMeta).find(k => location.pathname === k || location.pathname.startsWith(k + '/'))
  const meta = metaKey ? pageMeta[metaKey] : { title: 'Inventario', subtitle: '' }

  async function handleLogout() {
    setLoggingOut(true)
    try { if (refreshToken) await logoutRequest(refreshToken) } catch {}
    logout()
    navigate('/login')
  }

  const W = collapsed ? 64 : 240

  return (
    <>
      <style>{`
        .nav-item {
          display:flex; align-items:center; gap:10px;
          padding:8px 12px; border-radius:9px;
          font-size:13.5px; font-weight:500;
          color:rgba(224,225,221,0.55);
          text-decoration:none; cursor:pointer;
          transition:all 0.15s; position:relative;
          white-space:nowrap; border:none; background:none;
          width:100%; text-align:left; box-sizing:border-box;
        }
        .nav-item:hover { background:rgba(224,225,221,0.07); color:rgba(224,225,221,0.9); }
        .nav-item.active { background:rgba(224,225,221,0.12); color:#E0E1DD; font-weight:600; }
        .nav-item.active::before { content:''; position:absolute; left:0; top:22%; bottom:22%; width:3px; background:#778DA9; border-radius:0 3px 3px 0; }
        .sec-item {
          display:flex; align-items:center; gap:9px;
          padding:7px 10px; border-radius:8px;
          font-size:12.5px; font-weight:500;
          color:rgba(224,225,221,0.5);
          cursor:pointer; transition:all 0.15s;
          white-space:nowrap; overflow:hidden;
        }
        .sec-item:hover { background:rgba(224,225,221,0.06); color:rgba(224,225,221,0.85); }
        .sec-item.active { background:rgba(224,225,221,0.1); color:#E0E1DD; }
        .sidebar-logout:hover { background:rgba(252,165,165,0.1) !important; color:#fca5a5 !important; }
      `}</style>

      <div style={{ display:'flex', height:'100vh', background:'#f0f2f5', overflow:'hidden' }}>

        {/* ─── SIDEBAR ─── */}
        <aside style={{
          width:W, minWidth:W, flexShrink:0,
          background:'linear-gradient(180deg,#0D1B2A 0%,#1B263B 100%)',
          display:'flex', flexDirection:'column',
          transition:'width 0.22s ease, min-width 0.22s ease',
          overflow:'hidden', zIndex:10,
        }}>

          {/* Logo */}
          <div style={{ padding: collapsed ? '18px 0' : '18px 14px', borderBottom:'1px solid rgba(224,225,221,0.08)', flexShrink:0 }}>
            {collapsed ? (
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:config.primary_color||'#415A77', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', fontFamily:'Fraunces, serif' }}>
                  {(config.app_name||'M')[0].toUpperCase()}
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {config.app_logo_url ? (
                  <img src={config.app_logo_url} alt="logo" style={{ width:32, height:32, borderRadius:7, objectFit:'cover', flexShrink:0 }} />
                ) : (
                  <div style={{ width:32, height:32, borderRadius:8, background:config.primary_color||'#415A77', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', fontFamily:'Fraunces, serif', flexShrink:0 }}>
                    {(config.app_name||'M')[0].toUpperCase()}
                  </div>
                )}
                <div style={{ overflow:'hidden' }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#E0E1DD', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {config.app_name||'Mi Institución'}
                  </div>
                  {config.app_slogan && (
                    <div style={{ fontSize:10, color:'rgba(224,225,221,0.4)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {config.app_slogan}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Usuario */}
          <div style={{ padding: collapsed ? '12px 0' : '12px 14px', borderBottom:'1px solid rgba(224,225,221,0.08)', flexShrink:0 }}>
            {collapsed ? (
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'#415A77', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#E0E1DD' }}>{initials}</div>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'#415A77', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#E0E1DD', flexShrink:0 }}>{initials}</div>
                <div style={{ overflow:'hidden', flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#E0E1DD', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.fullName}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, color:config.accent_color||'#778DA9', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>{role.label}</div>
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: collapsed ? '10px 8px' : '10px 8px' }}>

            {!collapsed && (
              <div style={{ fontSize:9.5, fontWeight:800, color:'rgba(224,225,221,0.28)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 6px 6px', marginBottom:2 }}>
                Menú principal
              </div>
            )}

            <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <span style={{ fontSize:15, flexShrink:0 }}>⊞</span>
              {!collapsed && 'Dashboard'}
            </NavLink>

            <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <span style={{ fontSize:15, flexShrink:0 }}>📊</span>
              {!collapsed && 'Reportes'}
            </NavLink>

            {isAdmin && (
              <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>⊙</span>
                {!collapsed && 'Usuarios'}
              </NavLink>
            )}

            {/* Secciones */}
            <div style={{ marginTop:10 }}>
              {!collapsed ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:3, borderRadius:9, overflow:'hidden' }}>
                    {/* Click en el texto → navega a /sections (solo admin) */}
                    <button onClick={() => isAdmin ? navigate('/sections') : undefined}
                      className={`nav-item${location.pathname === '/sections' ? ' active' : ''}`}
                      style={{ flex:1, borderRadius:0, margin:0, cursor: isAdmin ? 'pointer' : 'default' }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>◫</span>
                      <span>Secciones</span>
                    </button>
                    {/* Flechita → colapsa/expande la lista */}
                    <button onClick={() => setSectionsOpen(o => !o)}
                      style={{ flexShrink:0, width:28, display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 4px', background:'none', border:'none', cursor:'pointer', color:'rgba(224,225,221,0.3)', transition:'color 0.15s', borderRadius:0 }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(224,225,221,0.7)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(224,225,221,0.3)'}>
                      <span style={{ fontSize:9, display:'inline-block', transition:'transform 0.2s', transform: sectionsOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
                    </button>
                  </div>

                  {sectionsOpen && (
                    <div style={{ marginLeft:8, borderLeft:'1px solid rgba(224,225,221,0.09)', paddingLeft:8, display:'flex', flexDirection:'column', gap:1 }}>
                      {sections.map(s => {
                        const isActive = location.pathname === `/sections/${s.id}/products`
                        return (
                          <div key={s.id} className={`sec-item${isActive ? ' active' : ''}`}
                            onClick={() => navigate(`/sections/${s.id}/products`)}>
                            <span style={{ fontSize:13, flexShrink:0 }}>{s.icon ?? '📁'}</span>
                            <span style={{ overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{s.name}</span>
                            {(s._count?.items ?? 0) > 0 && (
                              <span style={{ fontSize:9.5, background:'rgba(224,225,221,0.09)', borderRadius:999, padding:'1px 5px', color:'rgba(224,225,221,0.35)', flexShrink:0 }}>
                                {s._count!.items}
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {sections.length === 0 && (
                        <div style={{ fontSize:11.5, color:'rgba(224,225,221,0.22)', padding:'5px 6px', fontStyle:'italic' }}>Sin secciones</div>
                      )}
                      {isAdmin && (
                        <div className="sec-item" onClick={() => navigate('/sections')}
                          style={{ fontSize:11.5, color:'rgba(224,225,221,0.28)', marginTop:2 }}>
                          <span style={{ fontSize:11 }}>⚙</span>
                          <span>Gestionar secciones</span>
                        </div>
                      )}
                    </div>
                  )}


                </>
              ) : (
                <NavLink to="/sections" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ justifyContent:'center' }}>
                  <span style={{ fontSize:15 }}>◫</span>
                </NavLink>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: collapsed ? '8px 8px' : '8px', borderTop:'1px solid rgba(224,225,221,0.08)', flexShrink:0, display:'flex', flexDirection:'column', gap:2 }}>

            {isAdmin && (
              <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>⚙️</span>
                {!collapsed && 'Ajustes'}
              </NavLink>
            )}

            <button className="nav-item sidebar-logout" onClick={handleLogout} disabled={loggingOut}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <span style={{ fontSize:15, flexShrink:0 }}>⏻</span>
              {!collapsed && (loggingOut ? 'Saliendo...' : 'Cerrar sesión')}
            </button>

            <button className="nav-item" onClick={() => setCollapsed(c => !c)}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
              <span style={{ fontSize:13, flexShrink:0, display:'inline-block', transform: collapsed ? 'rotate(180deg)' : 'none', transition:'transform 0.22s' }}>◀</span>
              {!collapsed && <span style={{ fontSize:11.5, color:'rgba(224,225,221,0.3)' }}>Colapsar menú</span>}
            </button>
          </div>
        </aside>

        {/* ─── CONTENIDO ─── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <header style={{ background:'#fff', borderBottom:'1px solid #dde1e7', padding:'0 28px', height:60, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <h1 style={{ fontFamily:'Fraunces, serif', fontSize:20, fontWeight:700, color:'#0D1B2A', margin:0, letterSpacing:'-0.02em' }}>{meta.title}</h1>
              {meta.subtitle && <p style={{ fontSize:12.5, color:'#778DA9', margin:0, marginTop:1 }}>{meta.subtitle}</p>}
            </div>
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:role.bg, color:role.color, fontWeight:700 }}>
              {role.label}
            </span>
          </header>
          <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
