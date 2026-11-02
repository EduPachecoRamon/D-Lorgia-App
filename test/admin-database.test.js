import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseState } from '../src/services/supabase.js';
import { authState } from '../src/services/accounts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(root, 'src/server.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'public/admin.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'public/assets/admin-v400.js'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/assets/app-v400.js'), 'utf8');

test('v4 declara Supabase como capa opcional sin romper modo local', () => {
  const state = getSupabaseState();
  assert.equal(typeof state.configured, 'boolean');
  assert.equal(authState().provider, 'supabase');
  assert.match(app, /authBackend\.configured/);
  assert.match(app, /verifyAccount/);
});

test('backend expone auth real, estado de usuario y rutas admin protegidas', () => {
  assert.match(server, /\/api\/auth\/register/);
  assert.match(server, /\/api\/auth\/login/);
  assert.match(server, /\/api\/auth\/me/);
  assert.match(server, /\/api\/me\/state/);
  assert.match(server, /requireAdmin\(req\)/);
  assert.match(server, /\/api\/admin\/overview/);
});

test('schema PostgreSQL contiene roles, tratamientos, orientador y citas con RLS', () => {
  assert.match(schema, /create table if not exists public\.profiles/i);
  assert.match(schema, /role text not null default 'patient'/i);
  assert.match(schema, /create table if not exists public\.treatments/i);
  assert.match(schema, /create table if not exists public\.personal_guides/i);
  assert.match(schema, /create table if not exists public\.appointments/i);
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /appointments_active_slot_unique/i);
});

test('panel administrativo permite operar usuarios, citas y catálogo', () => {
  assert.match(adminHtml, /D’Lorgia Admin/);
  assert.match(adminHtml, /data-admin-panel="appointments"/);
  assert.match(adminHtml, /data-admin-panel="users"/);
  assert.match(adminHtml, /data-admin-panel="treatments"/);
  assert.match(adminJs, /\/api\/admin\/appointments/);
  assert.match(adminJs, /\/api\/admin\/treatments\/seed/);
});

test('frontend v4 sincroniza perfil remoto y conserva cache local', () => {
  assert.match(app, /syncRemoteState/);
  assert.match(app, /\/api\/profile/);
  assert.match(app, /BD conectada/);
  assert.match(app, /modo local/);
});
