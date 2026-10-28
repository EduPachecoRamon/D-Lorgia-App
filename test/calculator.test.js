import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrientation } from '../src/services/calculator.js';

test('calculadora genera orientación completa', () => {
  const result = calculateOrientation({ treatmentId: 'cleansing', goal: 'textura' });
  assert.equal(result.treatment.id, 'cleansing');
  assert.ok(result.expectations.results.length > 0);
  assert.ok(result.care.before.length > 0);
  assert.ok(result.care.after.length > 0);
  assert.match(result.disclaimer, /No es diagnóstico/i);
});

test('calculadora rechaza tratamiento desconocido', () => {
  assert.throws(() => calculateOrientation({ treatmentId: 'no-existe' }), /Tratamiento no encontrado/);
});
