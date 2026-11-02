# D’Lorgia Orienta v3.5 — Resiliencia y lógica de experiencia

## Objetivo
La v3.5 no añade otra función aislada: hace que Login, Orientador Personal, Asesor, Evaluación, Seguimiento y Mi espacio se comporten como un recorrido coherente y recuperable.

## Principios
1. El usuario siempre debe entender dónde está, qué está ocurriendo y qué puede hacer después.
2. Un error remoto no debe borrar datos locales ni obligar a repetir pasos.
3. El perfil, onboarding, Orientador y actividad reciente forman un contexto unificado para el Asesor.
4. La personalización cambia la presentación y prioridades, no los límites de seguridad ni la decisión clínica.
5. Las animaciones son ambientales, en bucle, no bloquean interacción y respetan reduced motion.

## Recuperación
- Login/registro: validación local y feedback dentro del formulario.
- Orientador: guarda borrador por paso y permite reintentar sin perder respuestas.
- Asesor: guarda la pregunta antes de enviarla; si falla, la restaura y ofrece reintento.
- Evaluación: guarda la reserva inmediatamente; si falla solo WhatsApp, reintenta únicamente el enlace.
- Red: banner offline + estado de experiencia; perfil/historial/navegación local continúan disponibles.
- Errores UI: centro de recuperación con Volver a Inicio o Recargar.

## Contexto del Asesor
Puede recibir: nombre/alias, sede, nivel de detalle preferido, estilo de apoyo, interés inicial, prioridades, perfil y ranking del Orientador, tratamiento actual, orientación previa, evaluación, recordatorios y mensajes recientes.

No debe usar esos datos para diagnosticar, prescribir, garantizar resultados o sustituir evaluación profesional.
