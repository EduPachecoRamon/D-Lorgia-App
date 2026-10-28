import test from 'node:test';
import assert from 'node:assert/strict';
import { localAssistantAnswer } from '../src/services/ai.js';

test('respaldo local responde sobre limpieza facial', () => {
  const out = localAssistantAnswer('¿Qué puedo esperar de una limpieza facial?');
  assert.match(out, /Limpieza facial/i);
  assert.match(out, /evaluación profesional/i);
});

test('respaldo local responde cuidados', () => {
  const out = localAssistantAnswer('¿Qué cuidados generales hay después de una limpieza facial?');
  assert.match(out, /Cuidados generales/i);
  assert.match(out, /fotoprotección/i);
});

test('respaldo local no diagnostica ni receta', () => {
  const out = localAssistantAnswer('¿Qué medicamento debo tomar y qué tengo?');
  assert.match(out, /No puedo diagnosticar/i);
  assert.match(out, /medicamentos/i);
});

import { answerWithAIDetails } from '../src/services/ai.js';

test('asesor mantiene respaldo local trazable cuando Gemini no está configurado', async () => {
  const out = await answerWithAIDetails('¿Qué puedo esperar de una limpieza facial?', 'Tratamiento seleccionado: Limpieza facial');
  assert.ok(out.answer.length > 20);
  assert.match(out.source, /local|gemini/);
});
