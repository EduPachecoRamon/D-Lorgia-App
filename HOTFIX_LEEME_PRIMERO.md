# HOTFIX v3.3.1 — Qué hacer al subirlo

Esta versión corrige el desorden visual visto después de desplegar v3.3.

## Causa
El navegador podía recibir `index.html` nuevo y reutilizar `styles.css` / `app.js` de una versión anterior. Eso provocaba:
- SVG grandes negros por encima del contenido.
- Login y registro visibles al mismo tiempo.
- Botones de pestaña con estilo nativo del navegador.

## Solución aplicada
- `styles-v331.css` y `app-v331.js` son URLs nuevas, por lo que no pueden confundirse con assets cacheados anteriores.
- El service worker usa un cache nuevo y limpia caches anteriores.
- Existe una guarda crítica dentro del HTML para evitar una pantalla rota mientras carga CSS.
- El fondo animado vive debajo de `main`, `header` y navegación.
- Se eliminaron los glifos decorativos antiguos que duplicaban el nuevo fondo SVG.

## Para GitHub
Copia TODO el contenido de esta carpeta dentro de tu repo local `D-Lorgia-App`, conservando `.git` y tu `.env` local si existe.

Después:

```powershell
npm test
git status
git add -A
git commit -m "fix: D'Lorgia v3.3.1 layout y cache"
git push
```

Tras el redeploy de Render, abre `/app`. Si esa pestaña ya estaba abierta antes del despliegue, haz una sola recarga forzada (`Ctrl + F5`). Con los assets v331, las siguientes cargas ya no dependen del CSS/JS anterior.
