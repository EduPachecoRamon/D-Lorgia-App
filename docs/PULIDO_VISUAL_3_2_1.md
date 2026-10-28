# D’Lorgia Orienta v3.2.1 — Pulido visual final

Esta revisión conserva la funcionalidad de v3.2 y añade una capa visual/interactiva sobre el diseño existente.

## Añadido

- Pantalla de ingreso demostrativa antes del onboarding/home.
- Opción de recordar el acceso localmente y modo invitado.
- Cierre de sesión sin borrar perfil, historial, orientaciones ni recordatorios.
- Sistema de 28 iconos SVG outline autocontenidos; no requiere CDN ni conexión externa.
- Fondo ambiental de iconos en caída vertical infinita con variaciones de velocidad, tamaño y deriva.
- Los iconos ambientales cambian según la pantalla activa (inicio, tratamientos, asesor, seguimiento, etc.).
- Microinteracciones en navegación, botones, tarjetas e iconos.
- Hero y onboarding con gradiente animado muy lento.
- Estado del inicio adaptado al progreso: personalizado, orientación actual o evaluación programada.
- Respeto de `prefers-reduced-motion`: se desactiva la lluvia de iconos y se minimizan animaciones.

## Decisiones de implementación

La pantalla de ingreso es una interfaz de demostración del prototipo y no una autenticación de producción. La clave no se almacena ni se envía. Para un producto real debe conectarse a un proveedor de identidad o backend seguro.

La iconografía se implementó con SVG inline en lugar de una librería CDN para preservar el funcionamiento PWA/offline y evitar dependencias externas.

## Verificación

- `node --check public/assets/app.js`: OK
- `npm test`: 14/14 pruebas aprobadas
- `/app`: HTTP 200
- IDs HTML: sin duplicados
- Referencias SVG: completas
