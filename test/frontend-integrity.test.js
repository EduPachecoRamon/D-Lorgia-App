import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/app-v400.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/styles-v400.css'), 'utf8');
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

test('asesor incluye estado visual de consulta y cache v4.0', () => {
  assert.match(js, /typing-dots/);
  assert.match(js, /is-thinking/);
  assert.match(css, /advisorBreath/);
  assert.match(sw, /dlorgia-orienta-v420-pulse/);
});


test('v4.0 mantiene el hotfix de layout y usa assets versionados', () => {
  assert.match(html, /styles-v400\.css/);
  assert.match(html, /app-v400\.js/);
  assert.match(html, /critical-v400/);
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
  assert.match(js, /Caminos del Orientador/);
  assert.match(js, /Crear perfil del Orientador/);
});


test('v3.5 conserva progreso y ofrece recuperación contextual', () => {
  assert.match(html, /id="experience-status"/);
  assert.match(html, /id="recovery-center"/);
  assert.match(js, /saveGuideDraft/);
  assert.match(js, /setChatDraft/);
  assert.match(js, /showRecovery/);
  assert.match(js, /La respuesta tardó demasiado/);
});

test('v3.5 usa perfil y recorrido completo como contexto del Asesor', () => {
  assert.match(html, /profile-communication/);
  assert.match(html, /profile-support/);
  assert.match(js, /experienceContext/);
  assert.match(js, /Preferencia de comunicación/);
  assert.match(js, /Forma de apoyo preferida/);
  assert.match(js, /Próximos recordatorios/);
});

test('chat muestra etapas de preparación sin fingir razonamiento interno', () => {
  assert.match(js, /Reuniendo tu perfil y preferencias/);
  assert.match(js, /Consultando el servicio de respuesta/);
  assert.match(js, /Preparando una respuesta segura y clara/);
  assert.match(css, /thinking-note/);
});
