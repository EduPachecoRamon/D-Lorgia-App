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
  const requested = pathname === '/' || pathname === '/app' ? '/index.html' : pathname;
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Web/app del prototipo final
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app' || url.pathname.startsWith('/assets/'))) {
    if (await serveStatic(res, url.pathname)) return;
  }

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return json(res, 200, {
      service: "D'Lorgia Orienta",
      version: '3.4.0',
      status: 'ok',
      whatsappConfigured: Boolean(config.accessToken && config.phoneNumberId),
      aiConfigured: getAIState().configured,
      aiProvider: getAIState().provider,
      aiModel: getAIState().model,
      assistantAvailable: true,
      modules: ['tratamientos', 'orientación', 'asesor personalizado', 'agenda', 'seguimiento', 'alarmas', 'mi espacio', 'evaluación', 'registro local', 'sesión por cuenta', 'orientador personal'],
      scheduling: getSchedulingInfo()
    });
  }

  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return json(res, 200, {
      publicBotNumber: config.publicBotNumber,
      defaultWhatsapp: branches.huancayo.phone,
      website: config.website,
      aiConfigured: getAIState().configured,
      aiProvider: getAIState().provider,
      aiModel: getAIState().model,
      assistantAvailable: true
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/catalog') {
    return json(res, 200, {
      items: orientationCatalog.map(({ id, category, name, short, description, objective, goals }) => ({ id, category, name, short, description, objective, goals })),
      goals: orientationGoals
    });
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
      return json(res, 200, buildPersonalGuide(body));
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
    return json(res, 200, getSchedule(branch, date));
  }

  if (req.method === 'POST' && url.pathname === '/api/reservations') {
    try {
      const body = await readJson(req);
      if (!String(body.name || '').trim() || !String(body.contact || '').trim()) {
        return json(res, 400, { error: 'Nombre y contacto son obligatorios.' });
      }
      const reservation = reserveSlot(body);
      return json(res, 201, { reservation });
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
        'Bot de WhatsApp Cloud API'
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
