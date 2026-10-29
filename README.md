# D’Lorgia Orienta v3.4 — ORIENTADOR PERSONAL — App de orientación y acompañamiento

Prototipo académico móvil centrado en una idea simple: **ayudar al paciente a comprender un tratamiento, organizar sus expectativas y continuar hacia una evaluación profesional sin convertir la IA en un médico virtual.**

## Módulos de la app
- **Orientador Personal:** recorrido guiado para quien aún no sabe qué camino explorar. Construye un perfil de preferencias y ordena tres opciones del catálogo por afinidad explicable; no diagnostica ni prescribe.
- **Acceso y cuentas:** registro, login, recuperación local, sesión persistente opcional y datos separados por cuenta en el navegador.
- **Inicio:** muestra continuidad y accesos rápidos según el recorrido del usuario.
- **Tratamientos:** catálogo por categorías y detalle de cada opción.
- **Orientador de expectativas:** evolución de la idea “Calculadora Digital de Expectativas Reales”. Organiza resultados referenciales, recuperación, sesiones a confirmar y cuidados.
- **Asesor personalizado:** usa el tratamiento, objetivo y etapa actual como contexto. Explica y orienta; no diagnostica, prescribe ni garantiza resultados.
- **Seguimiento y alarmas:** permite crear recordatorios locales, marcarlos como completados y activar notificaciones del navegador; el progreso cambia según acciones reales.
- **Fondos vivos:** motivos SVG grandes por sección descienden en loop, respetando el lenguaje visual del Figma y `prefers-reduced-motion`.
- **Mi espacio:** perfil, historial, tratamientos guardados, alarmas activas y descarga del último resumen.
- **Evaluación profesional:** prepara el siguiente paso y permite continuar con el equipo por WhatsApp.

## Resiliencia del asesor
El asesor tiene tres niveles:
1. **Gemini**, si `GEMINI_API_KEY` está configurada y responde correctamente.
2. **Respaldo local**, si Gemini no está configurado, falla por red, cuota o modelo.
3. **Reglas de seguridad**, para consultas de diagnóstico, medicación o señales preocupantes.

La app nunca debería quedar inutilizada únicamente porque falle la IA externa.

## Ejecutar localmente
Requiere Node.js 20+.

```bash
cp .env.example .env
npm test
npm start
```

Abre:

```text
http://localhost:3000/app
```

## Variables principales en Render
No subas `.env` a GitHub. Las credenciales deben permanecer en Render.

```env
PORT=3000
GEMINI_API_KEY=...
GEMINI_MODEL=...
PUBLIC_BOT_NUMBER=...
```

Las variables de Meta/WhatsApp pueden conservarse para una integración posterior, pero la v3 está diseñada para que **la app funcione por sí misma**.

## Endpoints principales
- `GET /app` — aplicación.
- `GET /health` — health check.
- `GET /api/status` — estado de módulos.
- `GET /api/catalog` — catálogo y objetivos.
- `POST /api/orientation` — orientación de expectativas.
- `POST /api/personal-guide` — construye perfil y caminos del Orientador Personal.
- `POST /api/assistant` — asesor con Gemini + fallback local.
- `POST /api/evaluation` — prepara la solicitud de evaluación.

## Persistencia del prototipo
Perfil, historial, tratamientos guardados, recordatorios y última orientación usan `localStorage`. No se deben introducir datos clínicos sensibles. En producción correspondería usar autenticación, base de datos, consentimiento, control de acceso y notificaciones push.

## Pruebas

```bash
npm test
```

La versión v3.4 incluye pruebas del Orientador Personal, autenticación, reglas del Asesor, fallback local, agenda, reservas y rutas existentes. Estado actual: **24/24 pruebas aprobadas**.


## Novedades v3.1–v3.2
- Onboarding personalizado con sede, interés y prioridad.
- Memoria contextual local del asesor basada en preferencias y últimas frases del usuario.
- Agenda funcional por sede/fecha con cupos y pre-reserva.
- Recordatorio automático al reservar.
- Animaciones y microinteracciones.
- **Mi Plan** dinámico con progreso de recorrido.
- Memoria visible del asesor mediante chips de contexto.
- **PWA instalable** con manifest, service worker y caché básico/offline.

> Nota: la agenda del prototipo guarda reservas en memoria del servidor. Para persistencia multiusuario real se requiere base de datos.

## Nota sobre autenticación
El registro/login de v3.3 es **funcional para el prototipo en un mismo navegador**. Las claves se derivan con PBKDF2 + SHA-256 y salt aleatorio; no se guarda la clave en texto plano. Para una versión de producción multi-dispositivo, sustituye esta capa por Firebase Auth, Supabase Auth, Auth0 u otro proveedor de identidad con recuperación verificada.


## Orientador Personal v3.4
El Orientador Personal conecta las páginas que ya existían en la app. Usa datos del onboarding como punto de partida, genera un perfil guardado por cuenta y lo reutiliza en Tratamientos, Detalle, Expectativas, Asesor, Evaluación, Seguimiento y Mi espacio. Los perfiles Clara, Alma y Nexo solo modifican el estilo de acompañamiento; el motor de afinidad y las reglas de seguridad son los mismos.

Consulta `docs/V3_4_ORIENTADOR_PERSONAL.md` para la arquitectura completa.
