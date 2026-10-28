# Prueba total — D’Lorgia Orienta v3.2 SUPER

## 1. Verificar versión en Render
Abre `/api/status`. Debe aparecer `"version":"3.2.0"`.

## 2. Primera entrada
- Debe aparecer onboarding.
- Ingresa alias, sede, interés y prioridad.
- Al guardar debe pasar a Inicio y mostrar saludo personalizado.

## 3. Mi Plan
- Debe mostrar 4 pasos y porcentaje.
- Al completar orientación, reserva y seguimiento, el progreso debe avanzar.

## 4. Asesor personalizado
- Selecciona un tratamiento.
- Dile: “Me preocupa una recuperación larga porque tengo clases”.
- Después pregunta: “¿Qué era lo que me preocupaba?”.
- El contexto enviado a Gemini/local incluye preferencias y últimas frases del usuario.
- En la tarjeta de contexto se muestran chips de memoria.

## 5. Agenda
- Evaluación → sede → fecha.
- Deben aparecer botones de horario.
- Domingo debe aparecer cerrado.
- Selecciona un cupo y reserva.
- Debe generar código DL-..., bloquear el horario y crear recordatorio.

## 6. Seguimiento
- La cita reservada debe aparecer como recordatorio.
- Se puede marcar completado y eliminar.

## 7. PWA
- Mi espacio → “Instalar D’Lorgia Orienta”.
- En navegador compatible debe permitir instalación; si no, muestra instrucción para Añadir a pantalla de inicio.
- Al perder conexión aparece banner de modo local.

## 8. API técnica
- `/health` → `{ "ok": true }`
- `/api/status` → status ok, version 3.2.0, agenda y estado de IA.
- `/api/schedule?branch=huancayo&date=AAAA-MM-DD` → slots.

## Limitación consciente
Las reservas viven en memoria del servidor Node. Si Render reinicia, se reinician. Para producción: base de datos + autenticación + control transaccional de cupos.
