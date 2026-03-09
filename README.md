# 🏫 inventario-jardin

Sistema de inventario para jardín infantil.

## Stack
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript _(próxima fase)_
- **Base de datos**: PostgreSQL + Prisma ORM

## Estructura
```
inventario-jardin/
├── backend/       ← API REST
├── frontend/      ← App React (pendiente)
└── README.md
```

## Inicio rápido

### 1. Requisitos
- Node.js >= 18
- PostgreSQL corriendo localmente

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # y editar DATABASE_URL
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### 3. Probar
```
GET http://localhost:3001/api/v1/health
POST http://localhost:3001/api/v1/auth/login
  Body: { "email": "admin@jardin.cl", "password": "admin123!" }
```
