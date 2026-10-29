# D’Lorgia Orienta v3.4 — Orientador Personal

## Objetivo
El **Orientador Personal** es una capa de decisión guiada que ayuda al usuario a convertir una intención vaga ("quiero mejorar algo, pero no sé qué explorar") en un perfil de preferencias y una ruta dentro de la app.

No reemplaza al **Asesor D’Lorgia** ni al **Orientador de expectativas**:
- Orientador Personal: guía el descubrimiento y organiza preferencias.
- Tratamientos: muestra fichas y opciones concretas.
- Orientador de expectativas: profundiza en un tratamiento ya elegido.
- Asesor: responde preguntas libres usando el contexto acumulado.
- Evaluación: confirma profesionalmente el camino.
- Seguimiento: organiza continuidad y recordatorios.

## Flujo
1. Estilo de acompañamiento: Clara (directa), Alma (acompañante) o Nexo (analítico).
2. Área a explorar.
3. Objetivo principal.
4. Hasta tres prioridades.
5. Preferencias prácticas: recuperación, intensidad, sensibilidad y opción previa a comparar.
6. Perfil final + tres caminos ordenados por afinidad con preferencias.

Los estilos cambian la forma de acompañar, no la lógica ni el contenido clínico.

## Lógica de afinidad
`src/services/personal-guide.js` compara las respuestas con el catálogo existente usando:
- coincidencia de área;
- objetivos ya declarados en cada ficha (`goals`);
- preferencia de recuperación;
- preferencia de intensidad de experiencia;
- prioridades del usuario;
- tratamiento que el usuario ya quería comparar.

El resultado se expresa como **afinidad con preferencias**, no como indicación clínica. Sensibilidad no se usa para diagnosticar o descartar opciones; se conserva como cautela para la evaluación.

## Integración con páginas existentes
- **Inicio:** entrada principal y resumen de perfil.
- **Tratamientos:** badges de afinidad en coincidencias.
- **Detalle:** explica por qué el tratamiento aparece o permite llevarlo al Orientador.
- **Expectativas:** precarga tratamiento, objetivo, sensibilidad y preferencia de recuperación.
- **Asesor:** recibe objetivo, área, prioridades y caminos del Orientador como contexto.
- **Evaluación:** precarga el interés cuando procede del Orientador.
- **Seguimiento:** el perfil del Orientador aparece como primer paso del recorrido.
- **Mi espacio:** guarda y resume el perfil por cuenta.

## Persistencia
El perfil usa `dlorgia:personalGuide:v1` y está incluido en las claves separadas por cuenta. No se almacena información clínica sensible.

## Endpoint
`POST /api/personal-guide`

Ejemplo de entrada:
```json
{
  "guideStyle": "nexo",
  "area": "Piel",
  "goal": "textura",
  "priorities": ["resultados", "recuperacion"],
  "recovery": "corta",
  "intensity": "minima",
  "sensitivity": "sensible"
}
```

## Seguridad de producto
El Orientador muestra explícitamente que:
- no diagnostica;
- no prescribe;
- no selecciona clínicamente un procedimiento;
- no garantiza resultados;
- la evaluación profesional confirma la decisión.
