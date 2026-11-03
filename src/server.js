import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { routeMessage } from './bot/router.js';
import { cleanupSessions } from './services/sessions.js';
import { sendButtons, sendList, sendText } from './services/meta.js';
import { answerWithAI, answerWithAIDetails, getAIState } from './services/ai.js';
import { orientationCatalog, orientationGoals } from './data/orientation.js';
import { calculateOrientation } from './services/calculator.js';
import { buildPersonalGuide } from './services/personal-guide.js';
import { branches } from './data/knowledge.js';
import { getSchedule, reserveSlot, getSchedulingInfo } from './services/scheduling.js';
import { authState, registerRemote, loginRemote, refreshRemote, recoverRemote, currentUser, requireAdmin, updateProfile, stateForUser, adminOverview } from './services/accounts.js';
import { getSupabaseState, dbSelect, dbInsert, dbUpdate, eq } from './services/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('Payload demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}

function validSignature(rawBody, signatureHeader) {
  if (!config.appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const received = signatureHeader.slice(7);
  const expected = crypto.createHmac('sha256', config.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function extractIncoming(payload) {
  const result = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        const incoming = { id: '', text: '' };
        if (message.type === 'text') incoming.text = message.text?.body || '';
        if (message.type === 'interactive') {
          const interactive = message.interactive || {};
          const choice = interactive.button_reply || interactive.list_reply || {};
          incoming.id = choice.id || '';
          incoming.text = choice.title || '';
        }
        result.push({ from: message.from, messageId: message.id, incoming });
      }
    }
  }
  return result;
}

async function dispatch(to, actions) {
  for (const action of actions) {
    if (action.kind === 'text') await sendText(to, action.body);
    if (action.kind === 'buttons') await sendButtons(to, action.body, action.buttons);
    if (action.kind === 'list') await sendList(to, action.body, action.buttonText, action.rows, action.sectionTitle);
    if (action.kind === 'link') await sendText(to, `${action.body}: ${action.url}`);
  }
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

async function serveStatic(res, pathname) {
  const requested = pathname === '/' || pathname === '/app' ? '/index.html' : pathname === '/admin' ? '/admin.html' : pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.resolve(publicDir, `.${safePath}`);
  if (!filePath.startsWith(publicDir)) return false;
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': path.extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function buildEvaluation({ name, contact, branch, interest, date, time }) {
  const selected = branches[branch] || branches.huancayo;
  const safeName = String(name || '').trim().slice(0, 80);
  const safeContact = String(contact || '').trim().slice(0, 120);
  const safeInterest = String(interest || 'Orientación general').trim().slice(0, 120);
  if (!safeName || !safeContact) {
    const error = new Error('Nombre y contacto son obligatorios.');
    error.code = 'BAD_REQUEST';
    throw error;
  }
  const safeDate = String(date || '').trim().slice(0, 20);
  const safeTime = String(time || '').trim().slice(0, 40);
  const preference = [safeDate && `Fecha preferida: ${safeDate}`, safeTime && `Horario: ${safeTime}`].filter(Boolean).join('. ');
  const message = `Hola, vengo de D’Lorgia Orienta. Soy ${safeName}. Me interesa ${safeInterest}. Quisiera solicitar una evaluación profesional. Mi contacto es ${safeContact}.${preference ? ` ${preference}.` : ''}`;
  return {
    branch: selected.name,
    message: `Tu solicitud quedó preparada para la sede ${selected.name}. Al continuar por WhatsApp, el equipo podrá confirmar disponibilidad y los siguientes pasos.`,
    whatsappUrl: `https://wa.me/${selected.phone}?text=${encodeURIComponent(message)}`
  };
}


function catalogRow(item, sortOrder = 0) {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    short: item.short || '',
    description: item.description || '',
    objective: item.objective || '',
    goals: item.goals || [],
    recovery: item.recovery || '',
    intensity: item.intensity || '',
    active: true,
    sort_order: sortOrder,
    updated_at: new Date().toISOString()
  };
}

async function databaseCatalog() {
  if (!getSupabaseState().databaseConfigured) return [];
  try {
    return await dbSelect('treatments', 'select=*&active=eq.true&order=sort_order.asc,name.asc');
  } catch (error) {
    console.warn('[DATABASE CATALOG FALLBACK]', error.message);
    return [];
  }
}

async function scheduleWithDatabase(branch, date) {
  const base = getSchedule(branch, date);
  if (!getSupabaseState().databaseConfigured || base.closed || !base.slots?.length) return base;
  try {
    const rows = await dbSelect('appointments', `select=time,status&branch=eq.${encodeURIComponent(branch)}&date=eq.${encodeURIComponent(date)}&status=in.(pending,confirmed)`);
    const occupied = new Set((rows || []).map((row) => row.time));
    return { ...base, slots: base.slots.map((slot) => occupied.has(slot.time) ? { ...slot, available:false, databaseOccupied:true } : slot), persistence:'postgresql' };
  } catch (error) {
    console.warn('[DATABASE SCHEDULE FALLBACK]', error.message);
    return { ...base, persistence:'memory-fallback' };
  }
}

async function reserveWithDatabase(req, body) {
  const state = getSupabaseState();
  const auth = state.databaseConfigured ? await currentUser(req, { optional:true }) : null;
  if (!state.databaseConfigured || !auth) return { reservation: reserveSlot(body), databaseAppointment:null };

  const branch = body.branch || 'huancayo';
  const schedule = await scheduleWithDatabase(branch, body.date);
  const slot = schedule.slots?.find((item) => item.time === body.time);
  if (!slot) { const error = new Error('Ese horario no pertenece a la agenda de la sede.'); error.status = 400; throw error; }
  if (!slot.available) { const error = new Error('Ese horario ya no está disponible. Elige otro.'); error.status = 409; throw error; }
  const reference = `DL-${Date.now().toString(36).toUpperCase()}`;
  try {
    const rows = await dbInsert('appointments', {
      user_id: auth.user.id,
      treatment_id: body.treatmentId || null,
      branch,
      interest: String(body.interest || 'Orientación general').trim().slice(0, 140),
      date: body.date || null,
      time: body.time || null,
      contact: String(body.contact || '').trim().slice(0, 120),
      status: 'pending',
      external_reference: reference,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    const appointment = rows?.[0];
    await logJourneyEvent({ userId: auth.user.id, actorId: auth.user.id, eventType: 'appointment_requested', source: 'patient', metadata: { appointment_id: appointment?.id || null, branch, date: body.date || null, time: body.time || null, treatment_id: body.treatmentId || null } });
    return {
      reservation: {
        id: reference, branch, branchName: schedule.branchName, date: body.date, time: body.time,
        name: String(body.name || '').trim().slice(0,80), contact: String(body.contact || '').trim().slice(0,120),
        interest: String(body.interest || 'Orientación general').trim().slice(0,120), status:'pending', createdAt:new Date().toISOString()
      },
      databaseAppointment: appointment || null
    };
  } catch (error) {
    if (/duplicate key|unique constraint|23505/i.test(String(error.message || '') + JSON.stringify(error.payload || {}))) {
      const conflict = new Error('Ese horario acaba de ser reservado por otra persona. Elige otro.'); conflict.status = 409; throw conflict;
    }
    throw error;
  }
}

function normalizeDatabaseTreatment(item) {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    short: item.short || '',
    description: item.description || '',
    objective: item.objective || '',
    goals: Array.isArray(item.goals) ? item.goals : [],
    recovery: item.recovery || '',
    intensity: item.intensity || ''
  };
}

async function persistGuideIfAuthenticated(req, body, result) {
  if (!getSupabaseState().databaseConfigured) return null;
  const auth = await currentUser(req, { optional: true });
  if (!auth) return null;
  const rows = await dbInsert('personal_guides', {
    user_id: auth.user.id,
    payload: body,
    result,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const saved = rows?.[0] || null;
  await logJourneyEvent({ userId: auth.user.id, actorId: auth.user.id, eventType: 'guide_completed', source: 'patient', metadata: { guide_id: saved?.id || null, goal: body?.goal || null, area: body?.area || null } });
  return saved;
}

async function persistAppointmentIfAuthenticated(req, payload, reservation) {
  if (!getSupabaseState().databaseConfigured) return null;
  const auth = await currentUser(req, { optional: true });
  if (!auth) return null;
  const rows = await dbInsert('appointments', {
    user_id: auth.user.id,
    treatment_id: payload.treatmentId || null,
    branch: payload.branch || 'huancayo',
    interest: String(payload.interest || 'Orientación general').slice(0, 140),
    date: payload.date || null,
    time: payload.time || null,
    contact: String(payload.contact || '').slice(0, 120),
    status: 'pending',
    external_reference: reservation?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  return rows?.[0] || null;
}


async function logJourneyEvent({ userId = null, actorId = null, eventType, source = 'system', metadata = {} } = {}) {
  if (!eventType || !getSupabaseState().databaseConfigured) return null;
  try {
    const rows = await dbInsert('journey_events', {
      user_id: userId || null,
      actor_id: actorId || null,
      event_type: String(eventType).slice(0, 80),
      source: String(source || 'system').slice(0, 40),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      created_at: new Date().toISOString()
    });
    return rows?.[0] || null;
  } catch (error) {
    // v4.2 mantiene compatibilidad con bases v4.0/v4.1 donde journey_events aún no existe.
    if (!/journey_events|relation .* does not exist|schema cache/i.test(String(error.message || ''))) {
      console.warn('[JOURNEY EVENT]', error.message);
    }
    return null;
  }
}

async function readJourneyEvents() {
  if (!getSupabaseState().databaseConfigured) return { items: [], available: false };
  try {
    const items = await dbSelect('journey_events', 'select=*&order=created_at.desc&limit=500');
    return { items: items || [], available: true };
  } catch (error) {
    return { items: [], available: false, reason: 'migration-required' };
  }
}

function publicSession(session = {}) {
  return {
    access_token: session.access_token || '',
    refresh_token: session.refresh_token || '',
    expires_in: session.expires_in || null,
    expires_at: session.expires_at || null,
    token_type: session.token_type || 'bearer'
  };
}

function serializeAuthError(error) {
  const status = Number(error?.status || 400);
  const raw = String(error?.message || 'No se pudo completar la autenticación.');
  if (/invalid login credentials/i.test(raw)) return { status: 401, message: 'Correo/usuario o clave incorrectos.' };
  if (/email not confirmed/i.test(raw)) return { status: 403, message: 'Confirma tu correo antes de ingresar.' };
  if (/already registered|already been registered/i.test(raw)) return { status: 409, message: 'Ese correo ya tiene una cuenta.' };
  return { status, message: raw };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Web/app del prototipo final
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app' || url.pathname === '/admin' || url.pathname.startsWith('/assets/'))) {
    if (await serveStatic(res, url.pathname)) return;
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return json(res, 200, {
      service: "D'Lorgia Orienta",
      version: '4.2.0',
      status: 'ok',
      whatsappConfigured: Boolean(config.accessToken && config.phoneNumberId),
      aiConfigured: getAIState().configured,
      aiProvider: getAIState().provider,
      aiModel: getAIState().model,
      assistantAvailable: true,
      database: authState(),
      modules: ['tratamientos', 'orientación', 'asesor personalizado', 'agenda', 'seguimiento', 'alarmas', 'mi espacio', 'evaluación', 'orientador personal', 'auth real', 'postgresql', 'panel admin'],
      scheduling: { ...getSchedulingInfo(), persistence: authState().databaseConfigured ? 'postgresql' : 'memory-prototype' }
    });
  }

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });


  if (req.method === 'GET' && url.pathname === '/api/auth/status') {
    return json(res, 200, authState());
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    if (!authState().configured) return json(res, 503, { error: 'La autenticación remota todavía no está configurada.' });
    try {
      const body = await readJson(req);
      const result = await registerRemote(body);
      return json(res, 201, {
        user: result.user ? { id: result.user.id, email: result.user.email } : null,
        profile: result.profile,
        session: result.session ? publicSession(result.session) : null,
        needsEmailConfirmation: result.needsEmailConfirmation
      });
    } catch (error) {
      const authError = serializeAuthError(error);
      return json(res, authError.status, { error: authError.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    if (!authState().configured) return json(res, 503, { error: 'La autenticación remota todavía no está configurada.' });
    try {
      const body = await readJson(req);
      const result = await loginRemote(body);
      return json(res, 200, {
        user: { id: result.user.id, email: result.user.email },
        profile: result.profile,
        session: publicSession(result.session)
      });
    } catch (error) {
      const authError = serializeAuthError(error);
      return json(res, authError.status, { error: authError.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/refresh') {
    if (!authState().configured) return json(res, 503, { error: 'La autenticación remota todavía no está configurada.' });
    try {
      const body = await readJson(req);
      const result = await refreshRemote(body.refresh_token);
      return json(res, 200, { user: { id: result.user.id, email: result.user.email }, profile: result.profile, session: publicSession(result.session) });
    } catch (error) {
      const authError = serializeAuthError(error);
      return json(res, authError.status, { error: authError.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/password-reset') {
    if (!authState().configured) return json(res, 503, { error: 'La autenticación remota todavía no está configurada.' });
    try {
      const body = await readJson(req);
      await recoverRemote(body.email || body.identifier);
      return json(res, 200, { ok: true, message: 'Si el correo existe, Supabase enviará las instrucciones de recuperación.' });
    } catch (error) {
      const authError = serializeAuthError(error);
      return json(res, authError.status, { error: authError.message });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/me') {
    try {
      const auth = await currentUser(req);
      return json(res, 200, { user: { id: auth.user.id, email: auth.user.email }, profile: auth.profile });
    } catch (error) { return json(res, error.status || 401, { error: error.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/me/state') {
    try {
      const auth = await currentUser(req);
      return json(res, 200, await stateForUser(auth.user.id));
    } catch (error) { return json(res, error.status || 401, { error: error.message }); }
  }

  if (req.method === 'PATCH' && url.pathname === '/api/profile') {
    try {
      const auth = await currentUser(req);
      const body = await readJson(req);
      const profile = await updateProfile(auth.user.id, body);
      return json(res, 200, { profile });
    } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  }


  if (req.method === 'POST' && url.pathname === '/api/events') {
    try {
      const auth = await currentUser(req);
      const body = await readJson(req);
      const allowed = new Set(['treatment_viewed','treatment_saved']);
      const eventType = String(body.eventType || '');
      if (!allowed.has(eventType)) return json(res, 400, { error: 'Evento no permitido.' });
      const event = await logJourneyEvent({ userId: auth.user.id, actorId: auth.user.id, eventType, source: 'patient', metadata: body.metadata || {} });
      return json(res, 201, { ok: true, persisted: Boolean(event) });
    } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  }

  if (url.pathname.startsWith('/api/admin/')) {
    if (!authState().configured) return json(res, 503, { error: 'Supabase todavía no está configurado.' });
    try {
      const adminAuth = await requireAdmin(req);
      if (req.method === 'GET' && url.pathname === '/api/admin/overview') return json(res, 200, await adminOverview());
      if (req.method === 'GET' && url.pathname === '/api/admin/events') return json(res, 200, await readJourneyEvents());
      if (req.method === 'GET' && url.pathname === '/api/admin/users') {
        const rows = await dbSelect('profiles', 'select=id,email,username,name,role,branch,created_at,updated_at&order=created_at.desc&limit=200');
        return json(res, 200, { items: rows });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/guides') {
        const [rows, profiles] = await Promise.all([
          dbSelect('personal_guides', 'select=id,user_id,payload,result,created_at,updated_at&order=created_at.desc&limit=200'),
          dbSelect('profiles', 'select=id,name,email,username')
        ]);
        const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
        return json(res, 200, { items: (rows || []).map((item) => ({ ...item, patient: byId.get(item.user_id) || null })) });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/appointments') {
        const [rows, profiles] = await Promise.all([
          dbSelect('appointments', 'select=*&order=created_at.desc&limit=200'),
          dbSelect('profiles', 'select=id,name,email,username')
        ]);
        const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
        return json(res, 200, { items: (rows || []).map((item) => ({ ...item, patient: byId.get(item.user_id) || null })) });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/treatments') {
        const rows = await dbSelect('treatments', 'select=*&order=sort_order.asc,name.asc');
        return json(res, 200, { items: rows });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/treatments/seed') {
        const rows = await dbInsert('treatments', orientationCatalog.map(catalogRow), { upsert: true, onConflict: 'id' });
        await logJourneyEvent({ actorId: adminAuth.user.id, eventType: 'catalog_seeded', source: 'admin', metadata: { count: orientationCatalog.length } });
        return json(res, 200, { items: rows, seeded: orientationCatalog.length });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/treatments') {
        const body = await readJson(req);
        if (!body.id || !body.name || !body.category) return json(res, 400, { error: 'ID, nombre y categoría son obligatorios.' });
        const rows = await dbInsert('treatments', { ...catalogRow(body), id: String(body.id).trim().slice(0,60), active: body.active !== false }, { upsert: true, onConflict: 'id' });
        await logJourneyEvent({ actorId: adminAuth.user.id, eventType: 'treatment_saved', source: 'admin', metadata: { treatment_id: String(body.id).trim().slice(0,60), name: body.name } });
        return json(res, 201, { item: rows?.[0] || null });
      }
      const appointmentMatch = url.pathname.match(/^\/api\/admin\/appointments\/([^/]+)$/);
      if (req.method === 'PATCH' && appointmentMatch) {
        const body = await readJson(req);
        const allowed = new Set(['pending','confirmed','completed','cancelled']);
        if (!allowed.has(body.status)) return json(res, 400, { error: 'Estado de cita inválido.' });
        const rows = await dbUpdate('appointments', eq('id', appointmentMatch[1]), { status: body.status, updated_at: new Date().toISOString() });
        const item = rows?.[0] || null;
        await logJourneyEvent({ userId: item?.user_id || null, actorId: adminAuth.user.id, eventType: 'appointment_status_changed', source: 'admin', metadata: { appointment_id: appointmentMatch[1], status: body.status } });
        return json(res, 200, { item });
      }
      const treatmentMatch = url.pathname.match(/^\/api\/admin\/treatments\/([^/]+)$/);
      if (req.method === 'PATCH' && treatmentMatch) {
        const body = await readJson(req);
        const patch = { updated_at: new Date().toISOString() };
        for (const key of ['name','category','short','description','objective','recovery','intensity','active','sort_order','goals']) if (body[key] !== undefined) patch[key] = body[key];
        const rows = await dbUpdate('treatments', eq('id', treatmentMatch[1]), patch);
        await logJourneyEvent({ actorId: adminAuth.user.id, eventType: 'treatment_updated', source: 'admin', metadata: { treatment_id: treatmentMatch[1], fields: Object.keys(body || {}) } });
        return json(res, 200, { item: rows?.[0] || null });
      }
      return json(res, 404, { error: 'Ruta administrativa no encontrada.' });
    } catch (error) { return json(res, error.status || 400, { error: error.message }); }
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return json(res, 200, {
      publicBotNumber: config.publicBotNumber,
      defaultWhatsapp: branches.huancayo.phone,
      website: config.website,
      aiConfigured: getAIState().configured,
      aiProvider: getAIState().provider,
      aiModel: getAIState().model,
      assistantAvailable: true,
      databaseConfigured: authState().configured
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/catalog') {
    const rows = await databaseCatalog();
    const items = rows.length ? rows.map(normalizeDatabaseTreatment) : orientationCatalog.map(({ id, category, name, short, description, objective, goals, recovery }) => ({ id, category, name, short, description, objective, goals, recovery }));
    return json(res, 200, { items, goals: orientationGoals, source: rows.length ? 'database' : 'bundled' });
  }

  if (req.method === 'POST' && url.pathname === '/api/orientation') {
    try {
      const body = await readJson(req);
      return json(res, 200, calculateOrientation(body));
    } catch (error) {
      return json(res, error.code === 'NOT_FOUND' ? 404 : 400, { error: error.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/personal-guide') {
    try {
      const body = await readJson(req);
      const guideRows = await databaseCatalog();
      const result = buildPersonalGuide(body, guideRows.length ? guideRows.map(normalizeDatabaseTreatment) : orientationCatalog);
      const saved = await persistGuideIfAuthenticated(req, body, result).catch((error) => { console.warn('[GUIDE DATABASE]', error.message); return null; });
      return json(res, 200, { ...result, persisted: Boolean(saved), databaseId: saved?.id || null });
    } catch (error) {
      console.error('[PERSONAL GUIDE ERROR]', error);
      return json(res, 400, { error: 'No se pudo construir el perfil de orientación.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    try {
      const body = await readJson(req);
      const message = String(body.message || '').trim();
      if (!message) return json(res, 400, { error: 'Escribe una pregunta.' });
      const result = await answerWithAIDetails(message, String(body.context || 'orientación web'));
      return json(res, 200, {
        answer: result.answer,
        source: result.source,
        model: result.model,
        provider: getAIState().provider
      });
    } catch (error) {
      console.error('[WEB AI ERROR]', error);
      return json(res, 500, { error: 'No se pudo procesar la consulta.' });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/schedule') {
    const branch = url.searchParams.get('branch') || 'huancayo';
    const date = url.searchParams.get('date') || '';
    return json(res, 200, await scheduleWithDatabase(branch, date));
  }

  if (req.method === 'POST' && url.pathname === '/api/reservations') {
    try {
      const body = await readJson(req);
      if (!String(body.name || '').trim() || !String(body.contact || '').trim()) {
        return json(res, 400, { error: 'Nombre y contacto son obligatorios.' });
      }
      const booking = await reserveWithDatabase(req, body);
      return json(res, 201, booking);
    } catch (error) {
      return json(res, 409, { error: error.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/evaluation') {
    try {
      const body = await readJson(req);
      return json(res, 200, buildEvaluation(body));
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/branches') {
    return json(res, 200, { branches });
  }

  if (req.method === 'GET' && url.pathname === '/api/features') {
    return json(res, 200, {
      product: "D'Lorgia Orienta",
      prototype: true,
      features: [
        'Catálogo de tratamientos',
        'Calculadora digital de expectativas reales (orientativa)',
        'Recuperación y cuidados',
        'Asesor personalizado con contexto y límites de seguridad',
        'Solicitud de evaluación',
        'Seguimiento y alarmas locales del prototipo',
        'Mi espacio con perfil, historial, guardados, alarmas y documentos',
        'Continuidad por WhatsApp',
        'Bot de WhatsApp Cloud API',
        'Autenticación Supabase',
        'PostgreSQL persistente',
        'Panel administrativo con roles'
      ]
    });
  }

  // Verificación y eventos de WhatsApp Cloud API
  if (req.method === 'GET' && url.pathname === '/webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && token === config.verifyToken) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(challenge || '');
    }
    return json(res, 403, { error: 'Webhook verification failed' });
  }

  if (req.method === 'POST' && url.pathname === '/webhook') {
    try {
      const raw = await readRawBody(req);
      if (!validSignature(raw, req.headers['x-hub-signature-256'])) {
        return json(res, 401, { error: 'Invalid signature' });
      }
      const payload = JSON.parse(raw.toString('utf8') || '{}');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');

      const messages = extractIncoming(payload);
      for (const item of messages) {
        try {
          const actions = await routeMessage(item.from, item.incoming);
          await dispatch(item.from, actions);
        } catch (error) {
          console.error('[MESSAGE ERROR]', error);
        }
      }
      return;
    } catch (error) {
      console.error('[WEBHOOK ERROR]', error);
      if (!res.headersSent) return json(res, 400, { error: 'Bad request' });
      return;
    }
  }

  if (req.method === 'GET' && await serveStatic(res, url.pathname)) return;
  return json(res, 404, { error: 'Not found' });
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`D'Lorgia Orienta listo en http://localhost:${config.port}`);
  console.log(`Web/App: http://localhost:${config.port}/app`);
  console.log(`Webhook: http://localhost:${config.port}/webhook`);
  console.log(`WhatsApp: ${config.accessToken && config.phoneNumberId ? 'configurado' : 'DRY RUN'}`);
  const ai = getAIState();
  console.log(`IA: ${ai.configured ? `activa (${ai.provider} · ${ai.model})` : 'modo local de respaldo'}`);
});

setInterval(() => cleanupSessions(), 60 * 60 * 1000).unref();
