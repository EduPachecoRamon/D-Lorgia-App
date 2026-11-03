# Prueba total — D’Lorgia Orienta v4.2 Pulse

## Automatizadas

Ejecutar:

```bash
npm test
node --check src/server.js
node --check public/assets/admin-v420.js
node --check public/assets/app-v400.js
```

Resultado esperado de esta entrega: **38/38 tests**.

## Checklist conectado a Supabase

1. `/api/auth/status` devuelve `configured`, `authConfigured` y `databaseConfigured` en `true`.
2. Login Admin abre `/admin` y muestra Resumen.
3. KPIs cargan pacientes, orientaciones, citas y pendientes.
4. Citas permite cambiar `pending → confirmed → completed/cancelled`.
5. Pacientes muestra el journey individual.
6. Orientaciones lista `personal_guides`.
7. Tratamientos permite cargar catálogo, crear, editar y activar/desactivar.
8. Calendario refleja fechas de `appointments`.
9. Centro de alertas marca pendientes y acciones sugeridas.
10. Pulse muestra funnel y Live Journey Map.
11. Después de ejecutar `supabase/v4_2_migration.sql`, Configuración muestra **Pulse Analytics · Operativo**.
12. Abrir un tratamiento desde `/app` crea un evento `treatment_viewed` cuando el paciente está autenticado.
13. Cambiar el estado de una cita crea un evento administrativo.
14. Auditoría muestra eventos de administración.
15. `Ctrl + K` abre Command Palette.
16. Modo Presentación oculta controles secundarios.
17. Fondo ambiental cambia de símbolos según la sección.
18. `prefers-reduced-motion` desactiva animaciones ambientales.
