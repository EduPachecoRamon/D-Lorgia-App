# D’Lorgia Orienta v4.1 — Admin Premium

Esta carpeta contiene la aplicación completa v4.1.

## Qué cambia en /admin

- Dashboard con sidebar y resumen.
- Animación breve de apertura.
- KPIs animados.
- Próximas citas y pulso semanal.
- Actividad reciente.
- Pacientes con Journey: Registro → Orientador → Evaluación → Confirmación → Completado.
- Historial real de Orientaciones desde PostgreSQL.
- Tratamientos en cards con modal de creación/edición.
- Filtros y búsquedas.
- Drawer lateral de detalles.
- Command Palette con Ctrl+K.
- Modo Presentación.
- Roles mostrados en español.

## Instalación / reemplazo

Copia TODO el contenido de esta carpeta sobre tu repositorio D-Lorgia-App. Conserva tu carpeta `.git` local y cualquier `.env` privado que tengas. No subas secretos a GitHub.

Las variables de Render siguen siendo las mismas:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY
- DLORGIA_ADMIN_EMAILS

El schema de Supabase v4 no necesita ejecutarse otra vez si ya lo ejecutaste correctamente.

## Prueba

```bash
npm test
npm start
```

Admin: `/admin`
App: `/app`
Estado: `/api/status`
