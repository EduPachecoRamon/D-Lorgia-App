# Changelog

## 3.2.1 — PULIDO VISUAL FINAL
- Añade pantalla de ingreso demostrativa antes del onboarding/home, sin almacenar la clave.
- Conserva todas las funciones de v3.2 y añade cierre de sesión sin borrar datos locales.
- Sustituye iconografía principal de caracteres Unicode por un sistema SVG outline autocontenido y coherente.
- Añade fondo ambiental de íconos con caída vertical infinita, velocidades, tamaños y deriva variables.
- El fondo cambia su conjunto de iconos según la pantalla activa.
- Añade microinteracciones en navegación, tarjetas, botones e iconos.
- Añade gradiente respirante al hero y al onboarding, respetando verde/crema/dorado.
- Inicio comunica el estado real del recorrido: personalización, orientación o evaluación programada.
- Mantiene `prefers-reduced-motion` y desactiva el fondo animado cuando el sistema solicita menos movimiento.
- Actualiza la caché PWA para evitar servir CSS/JS anteriores.

## 3.2.0 — SUPER
- Consolida toda la v3.1 merged: onboarding, memoria del asesor, agenda, reservas, recordatorio automático y animaciones.
- Añade Mi Plan dinámico y progreso visual.
- Añade memoria visible del asesor.
- Añade PWA instalable, iconos, service worker y modo offline básico.
- Añade indicador de conectividad.
- Refuerza microinteracciones y accesibilidad de movimiento reducido.

## 3.0.0 — App centrada en orientación y acompañamiento
- Rediseño visual completo de la app móvil.
- Asesor personalizado como módulo central, con contexto de tratamiento, objetivo y etapa.
- Límites explícitos: orienta y explica; no diagnostica, prescribe ni garantiza resultados.
- Gemini con respaldo local y trazabilidad del origen de la respuesta.
- Seguimiento con creación, marcado y eliminación de alarmas locales.
- Mi espacio: perfil, historial, tratamientos guardados, alarmas y documentos.
- Continuidad desde orientación hacia asesor, seguimiento y evaluación.
- Fondos e iconografía contextual por sección.
- Mejoras de navegación, estados vacíos y tolerancia a fallos.

## 2.0.0

### Conservado
- Webhook de WhatsApp Cloud API.
- Menú conversacional.
- Tratamientos y categorías.
- Asistente IA opcional.
- Derivación profesional.
- Sedes y continuidad por WhatsApp.
- Simulador, scripts y pruebas existentes.

### Añadido
- App/web móvil responsiva.
- Calculadora Digital de Expectativas Reales orientativa.
- Resultados esperados de referencia.
- Recuperación y duración/proceso.
- Cuidados antes y después.
- Seguimiento.
- Resumen de orientación.
- Solicitud de evaluación.
- Portal prototipo con historial local, documento resumen y recordatorios.
- Nueva opción “Expectativas reales” dentro del bot de WhatsApp.
- APIs `/api/catalog`, `/api/orientation`, `/api/assistant`, `/api/evaluation`.
- `render.yaml`.

### Eliminado
- Nada funcional del bot anterior fue eliminado.
- Solo se reemplazó la raíz JSON `/` por la interfaz web. El estado técnico pasó a `/api/status`.
