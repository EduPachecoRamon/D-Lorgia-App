# Subir D’Lorgia Orienta v3.4 a GitHub / Render

1. Haz una copia del repositorio actual por seguridad.
2. Conserva la carpeta `.git` del repositorio local.
3. Reemplaza el contenido del repositorio con el contenido de esta carpeta.
4. **No subas `.env`**. Las claves siguen en Render.
5. Ejecuta:

```bash
npm test
```

6. Si pasa, sube:

```bash
git add .
git commit -m "feat: D'Lorgia Orienta v3.4 con Orientador Personal"
git push
```

7. Espera a que Render redepliegue.
8. Prueba en este orden:
   - `/health`
   - `/api/status`
   - `/app`
   - Orientador Personal → completar perfil → revisar 3 caminos
   - Tratamientos → comprobar badges de afinidad → abrir detalle
   - Detalle → Orientar expectativas → Resumen
   - Asesor → comprobar contexto del Orientador → “¿Qué cuidados generales debo conocer?”
   - Seguimiento → crear alarma
   - Mi espacio → revisar historial y alarma

### Qué debe ocurrir si Gemini falla
El asesor debe responder usando el respaldo local. No debe mostrar al paciente “IA no configurada”.
