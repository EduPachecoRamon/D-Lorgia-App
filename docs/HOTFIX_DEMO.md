# Hotfix de demo — IA Gemini

Esta versión corrige la regresión en la que el proyecto v2 buscaba `OPENAI_API_KEY` mientras el despliegue de Render ya estaba configurado con `GEMINI_API_KEY` y `GEMINI_MODEL`.

## Comportamiento actual

- Si `GEMINI_API_KEY` existe, el asistente usa Gemini.
- El modelo se toma de `GEMINI_MODEL` (no hace falta cambiar el valor que ya funciona en Render).
- Si Gemini responde con error, hay un respaldo local seguro para las preguntas de demostración.
- El asistente nunca debe mostrar “IA no configurada” durante la demo: el respaldo local sigue disponible.
- `/api/status` informa proveedor y modelo sin revelar secretos.

## Prueba rápida después de desplegar

1. Abrir `/health` → debe responder `{\"ok\":true}`.
2. Abrir `/api/status` → debe mostrar `aiConfigured: true` y `aiProvider: \"Gemini\"` si Render conserva la clave.
3. Abrir `/app` → Asistente.
4. Probar: `¿Qué puedo esperar de una limpieza facial?`
5. Probar: `¿Qué cuidados generales hay después de una limpieza facial?`
