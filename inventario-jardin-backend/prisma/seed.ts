// =============================================================================
// prisma/seed.ts
// Crea el usuario administrador inicial del sistema.
// Si ya existe, NO lo modifica — operación idempotente.
//
// Ejecutar con:
//   npx prisma db seed
//   npm run seed
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed inicial...\n');

  const EMAIL    = 'admin@jardin.com';
  const PASSWORD = 'Admin123*';
  const NAME     = 'Admin';
  const ROLE     = 'ADMIN' as const;

  // ── Verificar si ya existe ───────────────────────────────────────────────

  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
  });

  if (existing) {
    console.log(`⚠️  El usuario "${EMAIL}" ya existe — no se realizaron cambios.`);
    console.log(`   ID:   ${existing.id}`);
    console.log(`   Rol:  ${existing.role}`);
    console.log(`   Estado: ${existing.status}`);
    return;
  }

  // ── Hashear contraseña con bcrypt (costo 12) ─────────────────────────────

  console.log('🔐 Generando hash de contraseña...');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ── Crear usuario ─────────────────────────────────────────────────────────

  const admin = await prisma.user.create({
    data: {
      email:              EMAIL,
      passwordHash:       passwordHash,
      fullName:           NAME,
      role:               ROLE,
      status:             'ACTIVE',
      mustChangePassword: false,
    },
    select: {
      id:        true,
      email:     true,
      fullName:  true,
      role:      true,
      status:    true,
      createdAt: true,
    },
  });

  // ── Resultado ─────────────────────────────────────────────────────────────

  console.log('\n✅ Usuario administrador creado exitosamente:\n');
  console.log(`   ID:        ${admin.id}`);
  console.log(`   Nombre:    ${admin.fullName}`);
  console.log(`   Email:     ${admin.email}`);
  console.log(`   Rol:       ${admin.role}`);
  console.log(`   Estado:    ${admin.status}`);
  console.log(`   Creado:    ${admin.createdAt.toLocaleString('es-CL')}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Credenciales de acceso:');
  console.log(`  Email:      ${EMAIL}`);
  console.log(`  Contraseña: ${PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function seedSystemConfig() {
  console.log('\n🔧 Configurando valores iniciales del sistema...');

  const defaults = [
    { key: 'app_name',          value: 'Mi Institución',  label: 'Nombre de la institución',   group: 'general' },
    { key: 'app_slogan',        value: '',                 label: 'Eslogan / subtítulo',        group: 'general' },
    { key: 'app_logo_url',      value: '',                 label: 'URL del logo',               group: 'general' },
    { key: 'primary_color',     value: '#1B263B',          label: 'Color primario',             group: 'theme'   },
    { key: 'accent_color',      value: '#415A77',          label: 'Color de acento',            group: 'theme'   },
    { key: 'login_title',       value: 'Gestión simple.',  label: 'Título del login',           group: 'login'   },
    { key: 'login_subtitle',    value: 'Control total.',   label: 'Subtítulo del login',        group: 'login'   },
    { key: 'login_description', value: 'Administra materiales, controla el stock y mantén el orden en cada sección del jardín infantil.', label: 'Descripción del login', group: 'login' },
    { key: 'login_features',    value: JSON.stringify(['Múltiples secciones','Control de stock','Alertas automáticas','Roles y permisos']), label: 'Pills de características', group: 'login' },
    { key: 'login_footer',      value: 'Sistema de Inventario', label: 'Pie del login',        group: 'login'   },
  ];

  for (const item of defaults) {
    await prisma.systemConfig.upsert({
      where:  { key: item.key },
      create: item,
      update: {},  // No sobreescribir valores existentes
    });
    console.log(`   ✓ ${item.key}`);
  }

  console.log('✅ Configuración del sistema lista\n');
}

main()
  .then(() => seedSystemConfig())
  .catch((error) => {
    console.error('\n❌ Error al ejecutar el seed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
