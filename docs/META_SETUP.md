# Configuración de Meta / WhatsApp Cloud API

## 1. Crear la app
1. En Meta for Developers crea una app de negocio.
2. Añade el producto **WhatsApp**.
3. En **API Setup**, usa el número de prueba mientras desarrollas.
4. Copia el `Phone number ID` y el token de acceso.

## 2. Configurar `.env`
Copia `.env.example` como `.env` y completa:

```env
WHATSAPP_VERIFY_TOKEN=un_token_que_tu_elijas
WHATSAPP_ACCESS_TOKEN=TOKEN_DE_META
WHATSAPP_PHONE_NUMBER_ID=PHONE_NUMBER_ID
META_APP_SECRET=APP_SECRET_DE_META
META_GRAPH_API_VERSION=v26.0
PUBLIC_BOT_NUMBER=NUMERO_DE_PRUEBA_O_PRODUCCION
```

`WHATSAPP_VERIFY_TOKEN` no lo entrega Meta: lo inventas tú y debe coincidir exactamente con el valor que escribas al registrar el webhook.

## 3. Hacer público el webhook
Meta no puede llamar a `localhost`. Para pruebas puedes exponer el puerto 3000 con un túnel HTTPS (por ejemplo Cloudflare Tunnel o ngrok) o desplegar el proyecto en un hosting Node.

La URL a registrar será:

```text
https://TU-DOMINIO/webhook
```

Webhook verify token:

```text
el mismo WHATSAPP_VERIFY_TOKEN de .env
```

Suscribe el webhook al campo de mensajes de WhatsApp.

## 4. Probar
Ejecuta:

```bash
npm start
```

Luego escribe **hola** al número de prueba de WhatsApp.

## 5. Firma del webhook
Si completas `META_APP_SECRET`, el servidor valida `X-Hub-Signature-256`. En producción no dejes este valor vacío.

## 6. Producción
Para pasar del número de prueba a un número real deben completar el proceso de Meta Business/WhatsApp correspondiente y usar un número autorizado por la organización. No conecten un número oficial de D'Lorgia sin autorización.
