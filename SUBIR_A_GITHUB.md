# Subir D’Lorgia Orienta v4.0 a GitHub / Render

## Código

Copia TODO el contenido de este proyecto sobre tu repo local `D-Lorgia-App`, conservando `.git` y cualquier `.env` local.

```powershell
npm test
git status
git add -A
git commit -m "feat: D'Lorgia Orienta v4 admin y base de datos"
git push
```

## Después del deploy

Sin Supabase configurado, la app seguirá en modo demo local.

Para activar v4 completa:

1. Crear proyecto Supabase.
2. Ejecutar `supabase/schema.sql`.
3. Añadir variables de `CONFIGURAR_SUPABASE_V4.md` en Render.
4. Redeploy.
5. Registrar el correo definido en `DLORGIA_ADMIN_EMAILS`.
6. Entrar a `/admin`.
7. Pulsar **Cargar catálogo base**.

## Verificar

- `/health`
- `/api/status`
- `/api/auth/status`
- `/app`
- `/admin`

No subas ninguna clave secreta a GitHub.
