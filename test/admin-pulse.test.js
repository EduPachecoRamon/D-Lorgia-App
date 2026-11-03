import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'public/admin.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/assets/admin-v420.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/admin-v420.css'),'utf8');
const app=fs.readFileSync(path.join(root,'public/assets/app-v400.js'),'utf8');
const server=fs.readFileSync(path.join(root,'src/server.js'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/v4_2_migration.sql'),'utf8');

test('v4.2 usa assets Pulse y fondo ambiental por sección',()=>{
  assert.match(html,/admin-v420\.css/);
  assert.match(html,/admin-v420\.js/);
  assert.match(html,/ambient-admin-layer/);
  assert.match(css,/@keyframes adminMotifRain/);
  assert.match(js,/setAmbientScene/);
});

test('dashboard Pulse incluye funnel, journey map, calendario, alertas e insights',()=>{
  for(const id of ['pulse-summary','patient-funnel','journey-map','calendar-grid','notification-panel','auto-insights','admin-audit']) assert.match(html,new RegExp(`id="${id}"`));
  for(const fn of ['renderPulse','renderFunnel','renderJourneyMap','renderCalendar','renderNotifications','renderInsights','renderAudit']) assert.match(js,new RegExp(fn));
});

test('migración v4.2 crea tracking de journey sin exponerlo al cliente',()=>{
  assert.match(migration,/create table if not exists public\.journey_events/i);
  assert.match(migration,/enable row level security/i);
  assert.match(migration,/revoke all on public\.journey_events from authenticated/i);
  assert.match(migration,/grant all on public\.journey_events to service_role/i);
});

test('app paciente registra exploración de tratamientos de forma opcional',()=>{
  assert.match(app,/trackJourneyEvent/);
  assert.match(app,/treatment_viewed/);
  assert.match(app,/treatment_saved/);
});

test('backend expone eventos admin y registra cambios operativos',()=>{
  assert.match(server,/\/api\/admin\/events/);
  assert.match(server,/appointment_status_changed/);
  assert.match(server,/catalog_seeded/);
  assert.match(server,/treatment_updated/);
});
