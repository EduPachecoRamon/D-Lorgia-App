# Configurar Supabase — D’Lorgia Orienta v4.0

Esta versión funciona en **modo demo local** sin Supabase, pero la crítica del profesor se responde cuando activas el modo conectado.

## 1. Crear proyecto

Crea un proyecto en Supabase y guarda:

- Project URL
- **Publishable key** (`sb_publishable_...`)
- **Secret key** (`sb_secret_...`)

Las claves legacy `anon` / `service_role` también son compatibles temporalmente, pero v4 prioriza las nuevas claves 2026.

## 2. Crear tablas y seguridad

En Supabase → SQL Editor → New query, pega y ejecuta:

`supabase/schema.sql`

Crea:

- `profiles`
- `treatments`
- `personal_guides`
- `appointments`
- trigger de perfil al registrar usuario
- RLS
- permisos por columna
- índice único de horarios activos para evitar doble reserva

## 3. Variables en Render

En el Web Service → Environment:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
DLORGIA_ADMIN_EMAILS=tu-correo-admin@ejemplo.com
```

Nunca subas `SUPABASE_SECRET_KEY` a GitHub.

Si tu proyecto todavía usa claves legacy:

```env
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

v4 las acepta como fallback.

## 4. Crear la cuenta Admin

1. Pon el correo del administrador en `DLORGIA_ADMIN_EMAILS`.
2. Registra esa cuenta desde `/app`.
3. Inicia sesión con ella.
4. El backend sincroniza `profiles.role = 'admin'`.
5. La cuenta será enviada a `/admin`.

Alternativa en SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo-admin@ejemplo.com';
```

## 5. Inicializar catálogo

En `/admin` → Tratamientos → **Cargar catálogo base**.

Esto copia a PostgreSQL los tratamientos que antes estaban embebidos en el código. A partir de ahí:

- el catálogo de la app sale de PostgreSQL;
- el Orientador Personal compara contra los tratamientos activos de PostgreSQL;
- si Admin desactiva un tratamiento, deja de salir en el catálogo y en nuevos rankings del Orientador.

## 6. Demo recomendada para el profesor

1. Registrar paciente.
2. Entrar al Orientador Personal y completarlo.
3. Cerrar sesión y volver a entrar: el Orientador permanece porque está en BD.
4. Solicitar una evaluación.
5. Abrir `/admin` con cuenta administrativa.
6. Ver la cita pendiente y cambiarla a `confirmed`.
7. Volver al paciente → Seguimiento / Mi espacio.
8. La evaluación aparece confirmada tras sincronizar.
9. Admin desactiva/crea un tratamiento.
10. Recargar paciente → catálogo y Orientador reflejan el cambio.

## 7. Verificación rápida

Antes de subir:

```powershell
npm test
npm start
```

Luego:

- `/health`
- `/api/status`
- `/api/auth/status`
- `/app`
- `/admin`

Con Supabase correctamente configurado, `/api/auth/status` debe indicar:

```json
{
  "configured": true,
  "authConfigured": true,
  "databaseConfigured": true
}
```
