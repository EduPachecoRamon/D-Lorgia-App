import { config } from '../config.js';

function baseUrl(path = '') {
  return `${String(config.supabaseUrl || '').replace(/\/$/, '')}${path}`;
}

export function getSupabaseState() {
  return {
    configured: Boolean(config.supabaseUrl && config.supabasePublishableKey && config.supabaseSecretKey),
    authConfigured: Boolean(config.supabaseUrl && config.supabasePublishableKey),
    databaseConfigured: Boolean(config.supabaseUrl && config.supabaseSecretKey),
    provider: 'supabase',
    projectUrl: config.supabaseUrl || ''
  };
}

async function request(path, { method = 'GET', body, token, service = false, headers = {} } = {}) {
  const state = getSupabaseState();
  if (!state.authConfigured) throw new Error('Supabase no está configurado.');
  const key = service ? config.supabaseSecretKey : config.supabasePublishableKey;
  if (!key) throw new Error(service ? 'Falta SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY legacy).' : 'Falta SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY legacy).');

  const response = await fetch(baseUrl(path), {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = text; }
  }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || `Supabase respondió ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return { data, response };
}

export async function authSignup({ email, password, name, username }) {
  const { data } = await request('/auth/v1/signup', {
    method: 'POST',
    body: { email, password, data: { name, username } }
  });
  return data;
}

export async function authLogin({ email, password }) {
  const { data } = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });
  return data;
}

export async function authRefresh(refreshToken) {
  const { data } = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken }
  });
  return data;
}

export async function authRecover(email) {
  const { data } = await request('/auth/v1/recover', {
    method: 'POST',
    body: { email }
  });
  return data;
}

export async function authUser(accessToken) {
  const { data } = await request('/auth/v1/user', { token: accessToken });
  return data;
}

export async function dbSelect(table, query = '', { single = false } = {}) {
  const suffix = query ? `?${query}` : '';
  const { data } = await request(`/rest/v1/${table}${suffix}`, { service: true });
  if (single) return Array.isArray(data) ? (data[0] || null) : data;
  return data || [];
}

export async function dbInsert(table, value, { upsert = false, onConflict = '', returning = true } = {}) {
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const headers = {
    Prefer: `${upsert ? 'resolution=merge-duplicates,' : ''}${returning ? 'return=representation' : 'return=minimal'}`
  };
  const { data } = await request(`/rest/v1/${table}${qs}`, { method: 'POST', body: value, service: true, headers });
  return data;
}

export async function dbUpdate(table, filterQuery, value, { returning = true } = {}) {
  const headers = { Prefer: returning ? 'return=representation' : 'return=minimal' };
  const { data } = await request(`/rest/v1/${table}?${filterQuery}`, { method: 'PATCH', body: value, service: true, headers });
  return data;
}

export async function dbDelete(table, filterQuery) {
  const { data } = await request(`/rest/v1/${table}?${filterQuery}`, { method: 'DELETE', service: true, headers: { Prefer: 'return=representation' } });
  return data;
}

export async function countRows(table, filterQuery = '') {
  const query = [`select=id`, filterQuery].filter(Boolean).join('&');
  const { response, data } = await request(`/rest/v1/${table}?${query}`, {
    service: true,
    headers: { Prefer: 'count=exact' }
  });
  const range = response.headers.get('content-range') || '';
  const match = range.match(/\/(\d+|\*)$/);
  if (match && match[1] !== '*') return Number(match[1]);
  return Array.isArray(data) ? data.length : 0;
}

export function eq(field, value) {
  return `${encodeURIComponent(field)}=eq.${encodeURIComponent(String(value))}`;
}

export function inList(field, values = []) {
  return `${encodeURIComponent(field)}=in.(${values.map((v) => encodeURIComponent(String(v))).join(',')})`;
}
