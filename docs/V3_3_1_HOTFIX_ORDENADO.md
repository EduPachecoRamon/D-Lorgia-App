# D’Lorgia Orienta v3.3.1 — Hotfix ordenado

Corrección de la mezcla de HTML v3.3 con CSS/JS cacheados de versiones previas.

- Assets nuevos: `styles-v331.css` y `app-v331.js`.
- Service worker con cache `dlorgia-orienta-v331-layout-hotfix` y estrategia network-first/no-store para la interfaz.
- Guardas críticas en HTML: si el CSS externo tarda, solo se muestra un formulario y se oculta el fondo ambiental.
- Fondo animado detrás de la UI mediante un stacking context propio.
- Se eliminan los glifos decorativos antiguos `screen::before/after` para evitar duplicados.
- Login/registro vuelven al sistema visual D’Lorgia y el registro puede hacer scroll sin solaparse.
