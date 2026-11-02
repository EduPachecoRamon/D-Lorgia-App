# Prueba total v3.5

- npm test: 27/27 OK
- app-v350.js: sintaxis OK
- server.js: sintaxis OK
- /health: 200 {ok:true}
- /api/status: v3.5.0 OK
- /app: 200
- /assets/app-v350.js: 200
- /assets/styles-v350.css: 200
- /api/personal-guide: devuelve 3 caminos
- IDs HTML duplicados: 0
- referencias SVG faltantes: 0
- llaves CSS: 743 / 743

Casos endurecidos:
- progreso del Orientador persiste por paso
- borrador del chat persiste antes de enviar
- timeout y modo offline producen feedback recuperable
- reserva se guarda antes de preparar continuidad por WhatsApp
- preferencias de comunicación y apoyo entran al contexto del Asesor
