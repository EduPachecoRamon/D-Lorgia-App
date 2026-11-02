# D’Lorgia Orienta v4.0 — Admin + Base de datos

Aplicación de orientación y acompañamiento para D’Lorgia. La v4 mantiene el diseño, Orientador Personal, Asesor, agenda, seguimiento, animaciones y resiliencia anteriores, pero añade una arquitectura real de cuentas y persistencia.

## Novedades v4

- **Supabase Auth** para cuentas multi-dispositivo.
- **PostgreSQL** para perfiles, tratamientos, Orientador y citas.
- **Roles `patient/admin`** validados en servidor.
- **Panel `/admin`** para usuarios, citas y catálogo.
- **Agenda persistente**: los horarios activos se bloquean en PostgreSQL.
- **Catálogo administrable**: cambios del Admin alimentan Tratamientos y el Orientador Personal.
- **Estado de cita real**: `pending`, `confirmed`, `completed`, `cancelled`.
- **RLS + grants por columna** para evitar escalamiento de rol o confirmaciones desde una cuenta paciente.
- **Modo degradado**: sin Supabase la app conserva el funcionamiento local del prototipo.

## Arquitectura

```text
Paciente / Admin
       ↓
D’Lorgia UI
       ↓
Node.js en Render
  ├─ Supabase Auth
  ├─ PostgreSQL
  ├─ Orientador Personal
  ├─ Gemini + fallback
  └─ WhatsApp
```

## Ejecutar localmente

```bash
npm test
npm start
```

- App: `http://localhost:3000/app`
- Admin: `http://localhost:3000/admin`
- Health: `http://localhost:3000/health`

Sin variables Supabase funciona en modo demo local.

## Configurar la base de datos

Lee **`CONFIGURAR_SUPABASE_V4.md`**.

Archivos importantes:

- `supabase/schema.sql`
- `src/services/supabase.js`
- `src/services/accounts.js`
- `public/admin.html`
- `public/assets/admin-v400.js`
- `public/assets/app-v400.js`

## Variables principales

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DLORGIA_ADMIN_EMAILS=
GEMINI_API_KEY=
```

La clave secreta nunca debe salir de Render/servidor.

## Pruebas

Construcción actual: **33/33**.

Consulta `PRUEBA_TOTAL_V4.md` para el checklist conectado a Supabase.
