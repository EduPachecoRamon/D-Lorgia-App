# Prueba total — D’Lorgia Orienta v4.0

## Automatizadas

Ejecutar:

```bash
npm test
```

Estado de construcción: **33/33 pruebas aprobadas**.

Incluyen regresión de:
- Asesor / fallback seguro;
- calculadora de expectativas;
- Orientador Personal;
- fondos/animaciones;
- resiliencia v3.5;
- agenda local;
- integración frontend;
- Auth/DB v4;
- panel Admin;
- schema PostgreSQL y RLS;
- catálogo dinámico del Orientador.

## Servidor sin credenciales

Debe seguir arrancando en modo demo:

- `GET /health` → 200
- `GET /api/status` → `version: 4.0.0`
- `GET /api/auth/status` → `configured: false`
- `GET /api/catalog` → `source: bundled`
- `GET /admin` → 200

## Prueba conectada a Supabase

Requiere credenciales reales en Render.

### Auth
- registrar paciente;
- login correo;
- login username;
- recuperación por correo;
- sesión persistente;
- cuenta de correo en `DLORGIA_ADMIN_EMAILS` obtiene `role=admin`.

### Database
- `profiles` recibe usuario;
- Orientador crea fila `personal_guides`;
- reserva crea fila `appointments`;
- catálogo Admin crea/edita `treatments`;
- doble reserva del mismo branch/date/time debe fallar.

### Admin
- paciente recibe 403 en `/api/admin/*`;
- admin recibe dashboard;
- admin confirma cita;
- paciente sincroniza estado confirmado;
- admin desactiva tratamiento;
- catálogo del paciente deja de mostrarlo;
- Orientador nuevo deja de rankearlo.
