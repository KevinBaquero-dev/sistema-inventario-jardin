# Inventario Jardín — Backend API

Sistema de gestión de inventario para jardín infantil.
**Stack:** Node.js + Express + TypeScript + PostgreSQL + Prisma ORM

---

## Requisitos previos

- Node.js ≥ 18.0.0
- PostgreSQL ≥ 14
- npm ≥ 9

---

## Instalación paso a paso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```

Editar `.env` con tus valores reales:
```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/inventario_jardin"
JWT_ACCESS_SECRET="genera-con-node-crypto-randomBytes-64-toString-hex"
JWT_REFRESH_SECRET="otro-secret-diferente-tambien-64-bytes"
```

Generar secrets seguros:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Crear la base de datos
```bash
# En PostgreSQL:
createdb inventario_jardin
# o desde psql: CREATE DATABASE inventario_jardin;
```

### 4. Ejecutar migraciones
```bash
npm run db:migrate
```

### 5. Cargar datos iniciales
```bash
npm run db:seed
```

### 6. Iniciar en desarrollo
```bash
npm run dev
```

El servidor arranca en: **http://localhost:3001**

---

## Credenciales iniciales

| Rol          | Email                    | Contraseña   |
|--------------|--------------------------|--------------|
| Admin        | admin@jardin.cl          | Admin1234!   |
| Coordinadora | coordinadora@jardin.cl   | Coord1234!   |

---

## Endpoints disponibles

### Health Check
```
GET /api/v1/health
```

### Autenticación
```
POST /api/v1/auth/login           → Iniciar sesión
POST /api/v1/auth/refresh         → Renovar access token
POST /api/v1/auth/logout          → Cerrar sesión
GET  /api/v1/auth/me              → Perfil del usuario (requiere token)
PUT  /api/v1/auth/change-password → Cambiar contraseña (requiere token)
```

---

## Scripts disponibles

```bash
npm run dev           # Desarrollo con hot-reload
npm run build         # Compilar TypeScript
npm run start         # Iniciar versión compilada
npm run type-check    # Verificar tipos TS sin compilar
npm run db:migrate    # Ejecutar migraciones
npm run db:seed       # Cargar datos iniciales
npm run db:studio     # Abrir Prisma Studio (UI para la BD)
npm run db:reset      # Resetear BD (CUIDADO: borra todos los datos)
```

---

## Estructura del proyecto

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Variables de entorno validadas
│   │   ├── database.ts     # Conexión Prisma (singleton)
│   │   └── logger.ts       # Sistema de logs Winston
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts      # JWT + roles
│   │   ├── error.middleware.ts     # Handler global de errores
│   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   └── validate.middleware.ts  # Validación Zod
│   ├── routes/
│   │   ├── index.ts         # Router raíz + health check
│   │   └── auth.routes.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── types/
│   │   └── index.ts         # Interfaces compartidas
│   ├── utils/
│   │   ├── jwt.ts           # Firma/verificación tokens
│   │   ├── response.ts      # Helpers de respuesta
│   │   └── slugify.ts
│   ├── app.ts               # Configuración Express
│   └── server.ts            # Entry point
├── prisma/
│   ├── schema.prisma        # Esquema de BD
│   └── seed.ts              # Datos iniciales
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Seguridad implementada

- **JWT dual:** Access token (15min) + Refresh token (7d) en BD
- **Bloqueo de cuenta:** 5 intentos fallidos → 15 min bloqueado
- **bcrypt:** Cost factor 12 (configurable)
- **Rate limiting:** 100 req/min general, 10/15min en login
- **CORS:** Lista blanca de orígenes
- **Helmet:** Headers HTTP de seguridad
- **Soft delete:** Los datos nunca se eliminan físicamente
- **Audit log:** Registro inmutable de todas las acciones

---

## Para el frontend (React + Vite)

La API usa el mismo formato de respuesta en todos los endpoints:
```json
{
  "success": true,
  "message": "Descripción de la operación",
  "data": { },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "meta": { "total": 100, "page": 1, "limit": 20 }
}
```

Configurar Axios con interceptor de refresh automático cuando reciba 401.
El frontend debe correr en uno de los orígenes listados en `CORS_ALLOWED_ORIGINS`.
