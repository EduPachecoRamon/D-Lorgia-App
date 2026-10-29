import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app-v340.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/styles-v340.css'), 'utf8');
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

test('asesor incluye estado visual de consulta y cache v3.4', () => {
  assert.match(js, /typing-dots/);
  assert.match(js, /is-thinking/);
  assert.match(css, /advisorBreath/);
  assert.match(sw, /dlorgia-orienta-v340-personal-guide/);
});


test('v3.4 mantiene el hotfix de layout y usa assets versionados', () => {
  assert.match(html, /styles-v340\.css/);
  assert.match(html, /app-v340\.js/);
  assert.match(html, /critical-v340/);
  assert.match(css, /\.ambient-layer\{z-index:0!important\}/);
  assert.match(css, /\.auth-form\{display:none!important\}/);
  assert.match(css, /\.screen::before,.screen::after\{content:none!important/);
});


test('Orientador Personal está integrado como módulo propio y no reemplaza al Asesor', () => {
  assert.match(html, /id="guide"/);
  assert.match(html, /ORIENTADOR PERSONAL/);
  assert.ok(js.includes('/api/personal-guide'));
  assert.match(js, /renderGuideResult/);
  assert.match(js, /advisorContextText/);
  assert.match(css, /guide-match-card/);
});

test('Orientador conecta Tratamientos, Asesor, Evaluación, Seguimiento y Mi espacio', () => {
  assert.match(js, /guideMatchFor/);
  assert.match(js, /openGuideEvaluation/);
  assert.match(js, /portal-guide-summary/);
  assert.match(js, /Orientador Personal - caminos para explorar/);
  assert.match(js, /Crear perfil del Orientador/);
});
