// =============================================================================
// src/services/settings.service.ts
// Configuración global del sistema — clave/valor en SystemConfig
// =============================================================================
import { db } from '../config/database';
import type { UpdateSettingsInput } from '../validators/settings.validator';

// Valores por defecto (se usan en el seed y como fallback)
export const DEFAULT_CONFIG: Record<string, { value: string; label: string; group: string }> = {
  app_name:          { value: 'Mi Institución',   label: 'Nombre de la institución',   group: 'general' },
  app_slogan:        { value: '',                  label: 'Eslogan / subtítulo',        group: 'general' },
  app_logo_url:      { value: '',                  label: 'URL del logo',               group: 'general' },
  primary_color:     { value: '#1B263B',           label: 'Color primario',             group: 'theme'   },
  accent_color:      { value: '#415A77',           label: 'Color de acento',            group: 'theme'   },
  login_title:       { value: 'Gestión simple.',   label: 'Título del login',           group: 'login'   },
  login_subtitle:    { value: 'Control total.',    label: 'Subtítulo del login',        group: 'login'   },
  login_description: { value: 'Administra materiales, controla el stock y mantén el orden en cada sección del jardín infantil.', label: 'Descripción del login', group: 'login' },
  login_features:    { value: JSON.stringify(['Múltiples secciones','Control de stock','Alertas automáticas','Roles y permisos']), label: 'Pills de características', group: 'login' },
  login_footer:      { value: 'Sistema de Inventario', label: 'Pie del login',         group: 'login'   },
};

export const SettingsService = {

  // Devuelve todas las configs como objeto plano { key: value }
  async getAll(): Promise<Record<string, string>> {
    const rows = await db.systemConfig.findMany();

    // Construir resultado combinando defaults + valores guardados
    const result: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_CONFIG)) {
      const saved = rows.find((r: { key: string; value: string }) => r.key === key);
      result[key] = saved ? saved.value : DEFAULT_CONFIG[key].value;
    }
    return result;
  },

  // Devuelve configs con metadata (para la página de ajustes)
  async getAllWithMeta() {
    const rows = await db.systemConfig.findMany({
      include: { updatedBy: { select: { id: true, fullName: true } } },
    });

    return Object.entries(DEFAULT_CONFIG).map(([key, def]) => {
      const saved = rows.find((r: { key: string; value: string; label?: string | null; updatedBy?: { id: string; fullName: string } | null }) => r.key === key);
      return {
        key,
        value:     saved ? saved.value : def.value,
        label:     saved ? saved.label : def.label,
        group:     saved ? saved.group : def.group,
        updatedAt: saved?.updatedAt ?? null,
        updatedBy: saved?.updatedBy ?? null,
      };
    });
  },

  // Actualiza uno o varios valores — solo los campos presentes en el input
  async update(input: UpdateSettingsInput, userId: string): Promise<Record<string, string>> {
    const entries = Object.entries(input) as [keyof UpdateSettingsInput, string][];

    // Upsert en paralelo — cada key es su propio registro
    await Promise.all(
      entries.map(([key, value]) => {
        const def = DEFAULT_CONFIG[key];
        return db.systemConfig.upsert({
          where:  { key },
          create: {
            key,
            value:       value ?? '',
            label:       def.label,
            group:       def.group,
            updatedById: userId,
          },
          update: {
            value:       value ?? '',
            updatedById: userId,
          },
        });
      })
    );

    return this.getAll();
  },

  // Seed inicial — crea los registros si no existen
  async seed(): Promise<void> {
    for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
      await db.systemConfig.upsert({
        where:  { key },
        create: { key, value: def.value, label: def.label, group: def.group },
        update: {},  // No sobreescribir si ya existe
      });
    }
  },
};
