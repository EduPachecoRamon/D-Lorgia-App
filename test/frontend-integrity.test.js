import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app-v331.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/styles-v331.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'public/service-worker.js'), 'utf8');

test('frontend incluye login, registro y recuperación local', () => {
  assert.match(html, /id="login-form"/);
  assert.match(html, /id="register-form"/);
  assert.match(html, /id="reset-form"/);
  assert.match(js, /createAccount/);
  assert.match(js, /verifyAccount/);
});

test('autenticación deriva claves y separa datos por cuenta', () => {
  assert.match(js, /PBKDF2/);
  assert.match(js, /SHA-256/);
  assert.match(js, /120000/);
  assert.match(js, /:account:\$\{activeIdentity\.id\}/);
});

test('fondos ambientales repiten motivos grandes y animados', () => {
  const motifs = (html.match(/class="ambient-motif motif-main"/g) || []).length;
  assert.ok(motifs >= 6);
  assert.match(css, /@keyframes motifRain/);
  assert.match(js, /followup: \{ primary: 'clock'/);
  assert.match(js, /login: \{ primary: 'sparkles'/);
});

test('asesor incluye estado visual de consulta y cache v3.3.1', () => {
  assert.match(js, /typing-dots/);
  assert.match(js, /is-thinking/);
  assert.match(css, /advisorBreath/);
  assert.match(sw, /dlorgia-orienta-v331-layout-hotfix/);
});


test('hotfix v3.3.1 evita mezcla de assets y mantiene el fondo detrás', () => {
  assert.match(html, /styles-v331\.css/);
  assert.match(html, /app-v331\.js/);
  assert.match(html, /critical-v331/);
  assert.match(css, /\.ambient-layer\{z-index:0!important\}/);
  assert.match(css, /\.auth-form\{display:none!important\}/);
  assert.match(css, /\.screen::before,.screen::after\{content:none!important/);
});
