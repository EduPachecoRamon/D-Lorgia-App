import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalGuide } from '../src/services/personal-guide.js';

test('orientador devuelve tres caminos ordenados y explicables', () => {
  const result = buildPersonalGuide({
    guideStyle: 'nexo', area: 'Piel', goal: 'textura',
    priorities: ['resultados', 'recuperacion'], recovery: 'corta', intensity: 'minima'
  });
  assert.equal(result.matches.length, 3);
  assert.equal(result.guide.id, 'nexo');
  assert.equal(result.profile.area, 'Piel');
  assert.ok(result.matches[0].score >= result.matches[1].score);
  assert.ok(result.matches[0].reasons.length > 0);
  assert.match(result.disclaimer, /No es diagnóstico/i);
});

test('orientador conserva sensibilidad como cautela y no como diagnóstico', () => {
  const result = buildPersonalGuide({ area: 'Piel', goal: 'cuidado', sensitivity: 'sensible' });
  assert.match(result.caution, /sensibilidad/i);
  assert.ok(result.matches.every((x) => x.considerations.some((item) => /evaluación|sensibilidad|compatibilidad/i.test(item))));
});

test('orientador incorpora una opción que el usuario desea comparar sin convertirla en diagnóstico', () => {
  const focused = buildPersonalGuide({ area: 'Tatuajes', goal: 'cuidado', treatmentId: 'tattoo', recovery: 'flexible', intensity: 'abierta' });
  assert.equal(focused.matches[0].id, 'tattoo');
  assert.ok(focused.matches[0].reasons.some((item) => /querías comparar/i.test(item)));
  assert.match(focused.disclaimer, /no es diagnóstico/i);
});
