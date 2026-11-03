# D’Lorgia Orienta v4.2 — PULSE

Esta carpeta contiene la aplicación completa. Se puede copiar sobre la v4.1 conservando `.git` y cualquier `.env` privado.

## Qué añade v4.2

- Fondo ambiental animado por sección, inspirado en la app principal.
- D’Lorgia Pulse con resumen operativo de la semana.
- Funnel real del paciente: registro → Orientador → exploración → evaluación → confirmación → completado.
- Live Journey Map con etapas y partículas visuales.
- Calendario administrativo mensual con detalle por día.
- Centro de notificaciones internas y alertas operativas.
- Insights automáticos calculados desde datos reales, sin fingir diagnóstico clínico.
- Centro del paciente mejorado con journey, afinidades y actividad reciente.
- Auditoría administrativa persistente cuando está activa la migración v4.2.
- Conteo de exploraciones de tratamientos.
- Command Palette, modo presentación, filtros, drawers y modales de v4.1 preservados.

## IMPORTANTE: migración opcional de analítica

La app y el Admin siguen funcionando sobre la base v4.0/v4.1. Para activar **Exploración**, auditoría persistente y Pulse Analytics completo:

1. Abre Supabase → SQL Editor.
2. Copia y ejecuta `supabase/v4_2_migration.sql`.
3. No borra datos ni reemplaza tablas anteriores.
4. Vuelve a Render y despliega la v4.2.

Sin esa migración, el Admin mostrará `Tracking parcial`, pero usuarios, citas, Orientador y tratamientos siguen funcionando.

## Render

Se mantienen las mismas variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DLORGIA_ADMIN_EMAILS`

## Pruebas

```bash
npm test
node --check src/server.js
node --check public/assets/admin-v420.js
```

Después del deploy abre `/admin` y haz `Ctrl + F5` una vez. El service worker v4.2 usa una cache nueva para impedir que los assets anteriores se queden pegados.
