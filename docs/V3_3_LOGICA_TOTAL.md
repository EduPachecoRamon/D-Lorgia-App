# D’Lorgia Orienta v3.3 — Lógica total

## Fondos vivos
Cada sección define un motivo principal y secundario. El principal se repite en varios tamaños y posiciones y cae verticalmente en un ciclo continuo. Seguimiento usa el reloj; Acceso y Asesor usan sparkles.

## Cuentas del prototipo
El registro y login funcionan en el navegador sin servidor de identidad. Las cuentas se almacenan en `localStorage`; la clave no se guarda directamente: se deriva con PBKDF2 + SHA-256 y un salt aleatorio usando Web Crypto.

Los datos del recorrido se separan por `accountId`: perfil, onboarding, última orientación, historial, tratamientos guardados, recordatorios, evaluación, preferencias y memoria del asesor.

> Este sistema es apropiado para la demostración académica. Para producción multi-dispositivo se debe reemplazar por Firebase Auth, Supabase Auth, Auth0 u otro servicio de identidad con recuperación verificada.

## Asesor
Durante una consulta, la UI entra en estado `is-thinking`, muestra puntos animados, bloquea temporalmente temas rápidos y restaura el control al recibir respuesta o error.

## Seguimiento
Los pasos 3 y 4 ya no son estáticos: se marcan como completados cuando existen recordatorios y cuando el usuario ha recibido al menos una respuesta del asesor.
