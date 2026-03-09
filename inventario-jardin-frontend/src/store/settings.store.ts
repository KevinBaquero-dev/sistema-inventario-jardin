// =============================================================================
// src/store/settings.store.ts
// Config global del sistema — cargada una vez al iniciar la app
// =============================================================================
import { create } from 'zustand'
import { settingsApi, type SystemConfig } from '../api/settings.api'

const DEFAULTS: SystemConfig = {
  app_name:          'Mi Institución',
  app_slogan:        '',
  app_logo_url:      '',
  primary_color:     '#1B263B',
  accent_color:      '#415A77',
  login_title:       'Gestión simple.',
  login_subtitle:    'Control total.',
  login_description: 'Administra materiales, controla el stock y mantén el orden en cada sección del jardín infantil.',
  login_features:    JSON.stringify(['Múltiples secciones','Control de stock','Alertas automáticas','Roles y permisos']),
  login_footer:      'Sistema de Inventario',
}

interface SettingsState {
  config:  SystemConfig
  loaded:  boolean
  loading: boolean
  fetch:   () => Promise<void>
  update:  (partial: Partial<SystemConfig>) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  config:  DEFAULTS,
  loaded:  false,
  loading: false,

  fetch: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const res = await settingsApi.get()
      set({ config: { ...DEFAULTS, ...res.data.data }, loaded: true })
    } catch {
      // Si falla (incluso 401), marcamos como loaded con defaults
      // para no reintentar en bucle
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  update: (partial) => {
    set(s => ({ config: { ...s.config, ...partial } }))
  },
}))
