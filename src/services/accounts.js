import { config } from '../config.js';
import {
  getSupabaseState, authSignup, authLogin, authRefresh, authRecover, authUser,
  dbSelect, dbInsert, dbUpdate, countRows, eq
} from './supabase.js';

export function authState() {
  const state = getSupabaseState();
  return { ...state, adminEmailsConfigured: config.adminEmails.length > 0 };
}

function normalizeEmail(value = '') { return String(value).trim().toLowerCase(); }
function normalizeUsername(value = '') { return String(value).trim().toLowerCase(); }

export async function profileById(id) {
  return dbSelect('profiles', `${eq('id', id)}&select=*`, { single: true });
}

export async function profileByUsername(username) {
  return dbSelect('profiles', `${eq('username', normalizeUsername(username))}&select=*`, { single: true });
}

export async function profileByEmail(email) {
  return dbSelect('profiles', `${eq('email', normalizeEmail(email))}&select=*`, { single: true });
}

export async function ensureProfile(user, metadata = {}) {
  if (!user?.id) throw new Error('Usuario inválido.');
  const email = normalizeEmail(user.email || metadata.email || '');
  const existing = await profileById(user.id);
  const role = config.adminEmails.includes(email) ? 'admin' : (existing?.role || 'patient');
  const username = normalizeUsername(existing?.username || metadata.username || user.user_metadata?.username || email.split('@')[0] || `user-${user.id.slice(0,8)}`);
  const name = String(existing?.name || metadata.name || user.user_metadata?.name || username).trim().slice(0, 80);
  const row = {
    id: user.id,
    email,
    username,
    name,
    role,
    branch: existing?.branch || 'huancayo',
    response_style: existing?.response_style || 'equilibrada',
    guidance_style: existing?.guidance_style || 'guiado',
    updated_at: new Date().toISOString()
  };
  const rows = await dbInsert('profiles', row, { upsert: true, onConflict: 'id' });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function registerRemote({ name, email, username, password }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  if (!name?.trim()) throw new Error('Escribe tu nombre o alias.');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Usa un correo válido.');
  if (!/^[a-z0-9._-]{3,30}$/i.test(normalizedUsername)) throw new Error('El usuario debe tener 3–30 caracteres válidos.');
  if (String(password || '').length < 8) throw new Error('La clave debe tener al menos 8 caracteres.');
  const taken = await profileByUsername(normalizedUsername);
  if (taken) throw new Error('Ese nombre de usuario ya está ocupado.');
  const signup = await authSignup({ email: normalizedEmail, password, name: name.trim(), username: normalizedUsername });
  const user = signup.user;
  let profile = null;
  if (user) profile = await ensureProfile(user, { name, username: normalizedUsername, email: normalizedEmail });
  return { user, session: signup.access_token ? signup : null, profile, needsEmailConfirmation: Boolean(user && !signup.access_token) };
}

export async function loginRemote({ identifier, password }) {
  const normalized = String(identifier || '').trim().toLowerCase();
  let email = normalized;
  if (!normalized.includes('@')) {
    const profile = await profileByUsername(normalized);
    if (!profile?.email) throw new Error('Correo/usuario o clave incorrectos.');
    email = profile.email;
  }
  const session = await authLogin({ email, password });
  const user = session.user || await authUser(session.access_token);
  const profile = await ensureProfile(user, { email });
  return { user, profile, session };
}

export async function refreshRemote(refreshToken) {
  const session = await authRefresh(refreshToken);
  const user = session.user || await authUser(session.access_token);
  const profile = await ensureProfile(user, { email: user.email });
  return { user, profile, session };
}

export async function recoverRemote(email) {
  const normalized = normalizeEmail(email);
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Escribe el correo de la cuenta.');
  await authRecover(normalized);
  return { ok: true };
}

export function bearerToken(req) {
  const value = String(req.headers.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function currentUser(req, { optional = false } = {}) {
  const token = bearerToken(req);
  if (!token) {
    if (optional) return null;
    const error = new Error('Inicia sesión para continuar.'); error.status = 401; throw error;
  }
  try {
    const user = await authUser(token);
    const profile = await ensureProfile(user, { email: user.email });
    return { user, profile, token };
  } catch (cause) {
    if (optional) return null;
    const error = new Error('La sesión expiró o no es válida.'); error.status = 401; error.cause = cause; throw error;
  }
}

export async function requireAdmin(req) {
  const auth = await currentUser(req);
  if (auth.profile?.role !== 'admin') {
    const error = new Error('Esta acción requiere una cuenta de administrador.'); error.status = 403; throw error;
  }
  return auth;
}

export async function updateProfile(userId, patch = {}) {
  const allowed = {};
  if (patch.name !== undefined) allowed.name = String(patch.name || '').trim().slice(0, 80);
  if (patch.branch !== undefined) allowed.branch = String(patch.branch || '').trim().slice(0, 40);
  if (patch.response_style !== undefined) allowed.response_style = String(patch.response_style || '').trim().slice(0, 40);
  if (patch.guidance_style !== undefined) allowed.guidance_style = String(patch.guidance_style || '').trim().slice(0, 40);
  allowed.updated_at = new Date().toISOString();
  const rows = await dbUpdate('profiles', eq('id', userId), allowed);
  return rows?.[0] || null;
}

export async function stateForUser(userId) {
  const [profile, guides, appointments] = await Promise.all([
    profileById(userId),
    dbSelect('personal_guides', `${eq('user_id', userId)}&select=*&order=created_at.desc&limit=1`),
    dbSelect('appointments', `${eq('user_id', userId)}&select=*&order=created_at.desc&limit=20`)
  ]);
  return { profile, latestGuide: guides?.[0] || null, appointments: appointments || [] };
}

export async function adminOverview() {
  const [users, guides, appointments, treatments, pending] = await Promise.all([
    countRows('profiles'), countRows('personal_guides'), countRows('appointments'), countRows('treatments'), countRows('appointments', 'status=eq.pending')
  ]);
  return { users, guides, appointments, treatments, pendingAppointments: pending };
}
