import test from 'node:test';
import assert from 'node:assert/strict';
import { routeMessage } from '../src/bot/router.js';

test('saludo muestra bienvenida y menú', async () => {
  const out = await routeMessage('u1', { text: 'hola', id: '' });
  assert.equal(out[0].kind, 'text');
  assert.equal(out[1].kind, 'list');
  assert.ok(out[1].rows.some((r) => r.id === 'treatments'));
});

test('tratamientos abre categorías', async () => {
  const out = await routeMessage('u2', { text: '', id: 'treatments' });
  assert.equal(out[0].kind, 'list');
  assert.ok(out[0].rows.some((r) => r.id === 'skin'));
});

test('riesgo deriva a atención profesional', async () => {
  const out = await routeMessage('u3', { text: 'tengo dolor muy fuerte e hinchazón importante', id: '' });
  assert.match(out[0].body, /atención profesional/i);
  assert.equal(out[1].kind, 'list');
});

test('selección de sede devuelve enlace oficial', async () => {
  const out = await routeMessage('u4', { text: '', id: 'branch:huancayo' });
  assert.equal(out[1].kind, 'link');
  assert.match(out[1].url, /wa\.me\/51915026618/);
});

test('expectativas abre calculadora conversacional', async () => {
  const out = await routeMessage('u5', { text: '', id: 'expectations' });
  assert.equal(out[0].kind, 'list');
  assert.ok(out[0].rows.some((r) => r.id === 'expect:cleansing'));
});

test('expectativa de limpieza devuelve recuperación, cuidados y evaluación', async () => {
  const out = await routeMessage('u6', { text: '', id: 'expect:cleansing' });
  assert.equal(out[0].kind, 'text');
  assert.match(out[0].body, /Recuperación/i);
  assert.match(out[0].body, /Cuidados posteriores/i);
  assert.equal(out[1].kind, 'buttons');
});
