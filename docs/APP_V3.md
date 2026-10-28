# D’Lorgia Orienta v3 — alcance de la app

## Idea central
La app funciona como un sistema de **orientación y acompañamiento**. El usuario puede explorar un tratamiento, generar expectativas referenciales, conversar con un asesor personalizado, organizar recordatorios y preparar una evaluación profesional.

## Flujo principal
Inicio → Tratamientos → Detalle → Orientador de expectativas → Resumen → Asesor / Seguimiento / Evaluación.

## Asesor personalizado
El asesor recibe contexto de navegación (tratamiento, objetivo y etapa), explica información en lenguaje claro y ayuda a organizar el siguiente paso. No diagnostica, prescribe medicamentos ni promete resultados.

## Resiliencia
1. Si Gemini está disponible, se usa como capa de lenguaje con reglas D’Lorgia.
2. Si Gemini falla o no está configurado, responde la base local del prototipo.
3. Si la consulta pide diagnóstico, medicación o describe señales preocupantes, se aplica una respuesta segura y se deriva a evaluación/atención profesional.

## Seguimiento y alarmas
Los recordatorios se guardan en `localStorage`. Las notificaciones del navegador funcionan mientras la app está abierta y con permiso. En una versión productiva se migrarían a notificaciones push y persistencia autenticada.

## Mi espacio
Contiene perfil local, historial de orientaciones, tratamientos guardados, alarmas y descarga del último resumen.

## Persistencia del prototipo
Los datos personales de la demo se guardan únicamente en el navegador. No se deben ingresar datos clínicos sensibles.
