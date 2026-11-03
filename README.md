# D’Lorgia Orienta v4.2 — Pulse

D’Lorgia Orienta combina la app del paciente con un panel administrativo real conectado a **Supabase Auth + PostgreSQL**. La v4.2 conserva la arquitectura de v4.0/v4.1 y convierte `/admin` en un centro de operaciones y analítica del recorrido del paciente.

## v4.2 Pulse

- Dashboard premium con fondo ambiental animado por sección.
- D’Lorgia Pulse: pendientes, pacientes nuevos, tendencia de orientaciones e interés destacado.
- Funnel del recorrido: registro → Orientador → exploración → evaluación → confirmación → completado.
- Live Journey Map.
- Calendario administrativo mensual.
- Centro de notificaciones y alertas operativas.
- Insights automáticos basados en datos reales.
- Centro de paciente con journey, afinidades y actividad reciente.
- Auditoría administrativa y tracking de tratamientos explorados mediante `journey_events`.
- Command Palette (`Ctrl + K`) y modo presentación.
- Supabase Auth, roles `patient/admin`, RLS y PostgreSQL persistente.

## Ejecutar

```bash
npm test
npm start
```

- App: `http://localhost:3000/app`
- Admin: `http://localhost:3000/admin`
- Health: `http://localhost:3000/health`

## Base de datos

Para una instalación nueva ejecuta `supabase/schema.sql`.

Si ya tienes la v4.0/v4.1 funcionando, **no repitas todo el schema**: ejecuta solamente:

`supabase/v4_2_migration.sql`

La migración añade `journey_events`; es opcional para el funcionamiento básico, pero necesaria para el funnel de exploración y la auditoría persistente.

## Variables Render

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DLORGIA_ADMIN_EMAILS=
GEMINI_API_KEY=
```

La clave secreta debe permanecer únicamente en Render/backend.

## Pruebas

La construcción v4.2 incluye **38 pruebas automatizadas**.

Consulta `PRUEBA_TOTAL_V4_2.md` y `LEEME_V4_2_PULSE.md`.
