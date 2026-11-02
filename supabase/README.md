# Supabase — D’Lorgia Orienta v4.0

1. Crea un proyecto en Supabase.
2. Abre **SQL Editor** y ejecuta `schema.sql`.
3. En Render agrega:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
# Legacy también funciona temporalmente: SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
DLORGIA_ADMIN_EMAILS=correo-admin@dominio.com
```

`SUPABASE_SECRET_KEY` va **solo en Render**, nunca en el navegador ni GitHub.

## Crear el admin

La forma más simple para la demo:

1. Configura `DLORGIA_ADMIN_EMAILS` con el correo deseado.
2. Registra esa cuenta desde D’Lorgia.
3. Al iniciar sesión, el backend sincroniza `profiles.role = admin`.
4. El usuario admin entra a `/admin`.

Alternativamente, en SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'correo-admin@dominio.com';
```

## Catálogo

El panel Admin tiene **“Cargar catálogo base”**. La primera vez copia los tratamientos incluidos en el proyecto a PostgreSQL. Desde ese punto `/api/catalog` usa la base de datos como fuente principal.
