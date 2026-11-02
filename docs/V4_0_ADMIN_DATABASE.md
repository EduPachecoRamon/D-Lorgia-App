# D’Lorgia Orienta v4.0 — Admin + Auth + PostgreSQL

## Objetivo

Responder a tres observaciones del profesor:

1. Cuenta administrativa real.
2. Mejor lógica de negocio.
3. Conexión persistente a base de datos.

## Roles

### Patient
Puede:
- registrarse / iniciar sesión;
- completar Orientador Personal;
- explorar tratamientos;
- usar Asesor;
- solicitar evaluación;
- mantener perfil y preferencias;
- ver el estado de su recorrido.

No puede:
- modificar roles;
- confirmar sus propias citas;
- editar catálogo;
- ver datos de otros pacientes.

### Admin
Puede:
- entrar a `/admin`;
- revisar usuarios;
- revisar citas;
- cambiar estado `pending → confirmed/completed/cancelled`;
- cargar catálogo base;
- crear tratamientos;
- activar/desactivar tratamientos.

El servidor valida `profiles.role = 'admin'` antes de cada ruta `/api/admin/*`.

## Fuente de verdad

### PostgreSQL
Fuente principal cuando Supabase está configurado:
- `profiles`
- `personal_guides`
- `appointments`
- `treatments`

### localStorage
Se conserva para:
- borradores;
- recuperación de UX;
- caché;
- modo demo sin BD.

Nunca debe considerarse fuente autoritativa de roles o confirmaciones administrativas.

## Flujo de autenticación

```
Login
  ↓
Node /api/auth/login
  ↓
Supabase Auth
  ↓
profiles.role
  ├── patient → /app
  └── admin   → /admin
```

La contraseña no se almacena en el backend D’Lorgia. En modo conectado, Supabase Auth la valida.

## Flujo Orientador

```
Paciente completa pasos
   ↓
POST /api/personal-guide + JWT
   ↓
Motor de afinidad
   ↓
Catálogo activo de PostgreSQL
   ↓
Resultado
   ↓
personal_guides (PostgreSQL)
```

Si PostgreSQL no responde, el motor puede usar el catálogo embebido como respaldo para que el prototipo no quede inutilizable.

## Flujo de cita

```
Paciente consulta agenda
  ↓
GET /api/schedule
  ↓
Agenda base + appointments PostgreSQL
  ↓
POST /api/reservations
  ↓
unique(branch,date,time) para pending/confirmed
  ↓
appointment status=pending
  ↓
Admin confirma
  ↓
patient sync
  ↓
Seguimiento muestra "Confirmada por el equipo"
```

El índice parcial `appointments_active_slot_unique` evita que dos pacientes mantengan el mismo horario activo.

## Catálogo dinámico

```
Admin → treatments PostgreSQL
                ↓
          /api/catalog
           ↙         ↘
   Tratamientos     Orientador
```

Esto evita que el panel administrativo sea decorativo: sus cambios afectan la experiencia del paciente.

## Seguridad

- clave secreta Supabase únicamente en Render;
- JWT del usuario para identificar sesión;
- rutas Admin verifican rol en servidor;
- RLS habilitado;
- grants por columna impiden que un paciente edite `role` o `status`;
- el usuario solo accede a sus filas mediante políticas `auth.uid()`.
