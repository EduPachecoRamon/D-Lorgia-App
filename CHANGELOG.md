# v3.3.1 — Hotfix de layout y caché

- Evita mezcla de HTML nuevo con CSS/JS viejos.
- Corrige SVG ambientales negros/sobre el contenido.
- Corrige tabs de Ingresar/Crear cuenta y paneles simultáneos.
- Refuerza scroll y stacking del acceso.
- Mantiene toda la lógica v3.3.

# D’Lorgia Orienta v3.3 — lógica total y fondos vivos

- Fondo ambiental rehecho con motivos SVG grandes repetidos que descienden en loop; Seguimiento usa relojes y Acceso usa sparkles según el lenguaje visual del Figma.
- Motivos secundarios y elementos de pantalla también tienen movimiento suave, respetando `prefers-reduced-motion`.
- Registro local funcional con nombre, correo, usuario y clave; validación de duplicados y fuerza de contraseña.
- Contraseñas derivadas con PBKDF2/SHA-256 mediante Web Crypto y salt aleatorio; no se guarda la clave en texto plano.
- Login real contra cuentas del dispositivo, sesión temporal o persistente (Recordarme), modo invitado y cierre de sesión.
- Recuperación local de acceso para el prototipo, con advertencia de que producción requeriría correo/OTP.
- Datos principales (perfil, orientación, historial, guardados, alarmas, preferencias y memoria del asesor) separados por cuenta.
- Migración única de datos de v3.2.x a la primera cuenta creada/iniciada para no perder el recorrido existente.
- Asesor animado durante consultas: typing dots, estado de carga, respuesta con entrada animada y halo/avatar activo.
- Seguimiento ahora completa pasos según recordatorios y uso real del asesor.
- Mi espacio muestra la identidad de la sesión actual.

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
