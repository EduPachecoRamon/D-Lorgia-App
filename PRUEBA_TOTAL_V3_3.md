# Prueba total — D’Lorgia Orienta v3.3

## Resultado automático
- `node --check public/assets/app.js`: correcto.
- `npm test`: **18/18 pruebas aprobadas**.
- IDs HTML duplicados: 0.
- Referencias SVG faltantes: 0.

## Verificaciones adicionales realizadas
- Derivación PBKDF2/SHA-256: la clave correcta valida y una incorrecta falla.
- La contraseña registrada no coincide con el valor almacenado (`passwordHash`).
- Dos cuentas reciben claves de almacenamiento distintas para `profile` y demás datos de recorrido.
- Revisión visual estática a 440×900 de Acceso, Registro, Asesor y Seguimiento.

## Alcance
La autenticación de v3.3 está diseñada para el prototipo académico y persiste en el navegador. No sustituye un proveedor de identidad de producción multi-dispositivo.
