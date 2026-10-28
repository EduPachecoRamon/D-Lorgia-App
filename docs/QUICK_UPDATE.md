# Actualización rápida en GitHub + Render

## Si ya tienes el repositorio clonado en tu PC
1. Descomprime este ZIP en una carpeta temporal.
2. Copia **todo el contenido interno** de `dlorgia-orienta-v2` sobre tu repositorio existente.
3. NO borres la carpeta `.git` de tu repositorio.
4. NO subas un archivo `.env` con secretos. Este ZIP solo trae `.env.example`.
5. En la terminal del repositorio:

```bash
git add .
git commit -m "feat: prototipo final D'Lorgia Orienta v2"
git push
```

6. Si Render está conectado al repositorio con Auto-Deploy, detectará el `push` y desplegará la nueva versión automáticamente.
7. Verifica en Render:
   - Start command: `npm start`
   - Health check: `/health`
   - Las variables de entorno anteriores siguen configuradas.
8. Prueba:

```text
https://TU-SERVICIO.onrender.com/health
https://TU-SERVICIO.onrender.com/app
https://TU-SERVICIO.onrender.com/api/features
```

## Variables nuevas/importantes
Para que los botones "Continuar por WhatsApp" abran el número del BOT, configura en Render:

```text
PUBLIC_BOT_NUMBER=51XXXXXXXXX
```

Usa formato internacional sin `+`, espacios ni guiones.

Si todavía no tienes número de Cloud API, la evaluación por sede sigue generando enlaces de WhatsApp y el resto de la app funciona.
