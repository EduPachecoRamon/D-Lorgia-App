# D’Lorgia Orienta v3.2 SUPER

Esta versión consolida el producto alrededor del **Asesor personalizado** y el acompañamiento del paciente.

## Flujo principal
Onboarding → Tratamientos → Orientación → Asesor → Agenda/Evaluación → Seguimiento → Mi espacio.

## Superadiciones
1. Memoria contextual local del asesor.
2. Agenda funcional por sede/fecha y bloqueo de cupos.
3. Mi Plan dinámico con avance.
4. PWA instalable y caché offline básico.
5. Animaciones y microinteracciones con soporte `prefers-reduced-motion`.

## Límite del prototipo
Las reservas viven en memoria del proceso Node. Un reinicio de Render las reinicia. La evolución de producción debe usar persistencia (PostgreSQL/Firebase/etc.) y autenticación.
