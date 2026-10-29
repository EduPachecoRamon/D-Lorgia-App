const DLORGIA_BUILD = '3.4.0-personal-guide';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const rawStore = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); }
};

const AUTH_ACCOUNTS_KEY = 'dlorgia:auth:accounts:v1';
const AUTH_PERSIST_KEY = 'dlorgia:auth:persisted:v1';
const AUTH_SESSION_KEY = 'dlorgia:auth:session:v1';
const LEGACY_MIGRATION_KEY = 'dlorgia:auth:legacyMigrated:v1';
const USER_SCOPED_KEYS = new Set([
  'dlorgia:lastOrientation', 'dlorgia:history', 'dlorgia:profile', 'dlorgia:reminders:v3',
  'dlorgia:savedTreatments', 'dlorgia:advisorMemory:v1', 'dlorgia:preferences:v1',
  'dlorgia:onboardingComplete', 'dlorgia:lastEvaluation', 'dlorgia:personalGuide:v1'
]);

let activeIdentity = null;

function scopedStorageKey(key) {
  if (activeIdentity?.kind === 'account' && USER_SCOPED_KEYS.has(key)) return `${key}:account:${activeIdentity.id}`;
  return key;
}

const store = {
  get(key, fallback = null) { return rawStore.get(scopedStorageKey(key), fallback); },
  set(key, value) { rawStore.set(scopedStorageKey(key), value); },
  remove(key) { rawStore.remove(scopedStorageKey(key)); }
};

let catalog = [];
let config = {};
let currentOrientation = null;
let selectedTreatment = null;
let advisorFocus = 'orientacion';
let navStack = ['home'];
let activeCategory = 'Todas';
let guideStep = null;
let guideDraft = {};
let guideBusy = false;

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
}
function list(items = []) { return `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`; }
function formatDate(iso) {
  try { return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso || ''; }
}
function formatShortDate(date, time = '') {
  if (!date) return 'Sin fecha';
  try {
    const d = new Date(`${date}T${time || '12:00'}:00`);
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}) }).format(d);
  } catch { return `${date} ${time}`.trim(); }
}
function getProfile() { return store.get('dlorgia:profile', {}); }
function getReminders() { return store.get('dlorgia:reminders:v3', []); }
function setReminders(items) { store.set('dlorgia:reminders:v3', items); }
function getSavedTreatments() { return store.get('dlorgia:savedTreatments', []); }
function setSavedTreatments(items) { store.set('dlorgia:savedTreatments', items); }
function getAdvisorMemory() { return store.get('dlorgia:advisorMemory:v1', []); }
function setAdvisorMemory(items) { store.set('dlorgia:advisorMemory:v1', items.slice(-16)); }
function rememberAdvisor(role, text) {
  const clean = String(text || '').trim().slice(0, 700);
  if (!clean) return;
  setAdvisorMemory([...getAdvisorMemory(), { role, text: clean, at: new Date().toISOString() }]);
}
function getPreferences() { return store.get('dlorgia:preferences:v1', {}); }
function savePreferences(value) { store.set('dlorgia:preferences:v1', value); }
function getPersonalGuide() { return store.get('dlorgia:personalGuide:v1', null); }
function setPersonalGuide(value) { store.set('dlorgia:personalGuide:v1', value); }


function icon(name, className = 'ui-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

const ambientScenes = {
  login: { primary: 'sparkles', secondary: 'leaf', accents: ['sparkles','heart','lock'] },
  onboarding: { primary: 'sparkles', secondary: 'heart', accents: ['sparkles','heart','calendar'] },
  home: { primary: 'sparkles', secondary: 'heart-pulse', accents: ['sparkles','calendar','heart'] },
  guide: { primary: 'compass', secondary: 'sparkles', accents: ['compass','target','sparkles'] },
  catalog: { primary: 'scan', secondary: 'sparkles', accents: ['scan','target','sparkles'] },
  detail: { primary: 'sparkles', secondary: 'scan', accents: ['sparkles','target','heart'] },
  calculator: { primary: 'target', secondary: 'clock', accents: ['target','sparkles','clock'] },
  assistant: { primary: 'sparkles', secondary: 'message', accents: ['sparkles','message','heart'] },
  summary: { primary: 'file', secondary: 'check', accents: ['file','check','bookmark'] },
  evaluation: { primary: 'stethoscope', secondary: 'calendar', accents: ['stethoscope','calendar','check'] },
  followup: { primary: 'clock', secondary: 'bell', accents: ['clock','bell','calendar'] },
  portal: { primary: 'user', secondary: 'bookmark', accents: ['user','file','bell'] }
};

function setAmbientScene(scene) {
  const layer = $('#ambient-layer');
  if (!layer) return;
  layer.dataset.scene = scene;
  const theme = ambientScenes[scene] || ambientScenes.home;
  $$('.motif-main use').forEach((use) => use.setAttribute('href', `#i-${theme.primary}`));
  $$('.motif-secondary use').forEach((use) => use.setAttribute('href', `#i-${theme.secondary}`));
  $$('.ambient-icon use').forEach((use, index) => use.setAttribute('href', `#i-${theme.accents[index % theme.accents.length]}`));
}

function hasEntryAccess() {
  return Boolean(activeIdentity);
}

function getAccounts() { return rawStore.get(AUTH_ACCOUNTS_KEY, []); }
function setAccounts(accounts) { rawStore.set(AUTH_ACCOUNTS_KEY, accounts); }
function normalizeIdentifier(value = '') { return String(value).trim().toLowerCase(); }
function usernameIsValid(value = '') { return /^[a-z0-9._-]{3,30}$/i.test(String(value).trim()); }
function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) || password.length >= 12) score++;
  return score;
}
function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}
async function derivePassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64ToBytes(salt), iterations: 120000, hash: 'SHA-256' }, material, 256);
  return bytesToBase64(new Uint8Array(bits));
}
function findAccount(identifier) {
  const needle = normalizeIdentifier(identifier);
  return getAccounts().find((account) => account.email === needle || account.username === needle) || null;
}
function publicIdentity(account) {
  return { kind: 'account', id: account.id, name: account.name, email: account.email, username: account.username };
}
function migrateLegacyData(accountId) {
  if (rawStore.get(LEGACY_MIGRATION_KEY)) return;
  let copied = false;
  for (const key of USER_SCOPED_KEYS) {
    const legacy = localStorage.getItem(key);
    const scoped = `${key}:account:${accountId}`;
    if (legacy !== null && localStorage.getItem(scoped) === null) {
      localStorage.setItem(scoped, legacy);
      copied = true;
    }
  }
  rawStore.set(LEGACY_MIGRATION_KEY, { accountId, copied, at: new Date().toISOString() });
}
function loadUserState() {
  guideStep = null;
  guideDraft = {};
  currentOrientation = store.get('dlorgia:lastOrientation');
  selectedTreatment = currentOrientation?.treatment?.id || getPersonalGuide()?.matches?.[0]?.id || null;
  if (selectedTreatment && $('#treatment-select')) $('#treatment-select').value = selectedTreatment;
  if (currentOrientation?.treatment?.name && $('#eval-interest')) $('#eval-interest').value = currentOrientation.treatment.name;
}
function writeSession(identity, remember = false) {
  localStorage.removeItem(AUTH_PERSIST_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  const payload = JSON.stringify({ kind: identity.kind, accountId: identity.id || null, issuedAt: new Date().toISOString() });
  if (remember && identity.kind === 'account') localStorage.setItem(AUTH_PERSIST_KEY, payload);
  else sessionStorage.setItem(AUTH_SESSION_KEY, payload);
}
function restoreAuthSession() {
  const raw = localStorage.getItem(AUTH_PERSIST_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (session.kind === 'guest') {
      activeIdentity = { kind: 'guest', id: 'guest', name: 'Invitado' };
      loadUserState();
      return true;
    }
    const account = getAccounts().find((item) => item.id === session.accountId);
    if (!account) throw new Error('Cuenta no disponible');
    activeIdentity = publicIdentity(account);
    migrateLegacyData(account.id);
    loadUserState();
    return true;
  } catch {
    localStorage.removeItem(AUTH_PERSIST_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    activeIdentity = null;
    return false;
  }
}
function clearAuthSession() {
  localStorage.removeItem(AUTH_PERSIST_KEY);
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  activeIdentity = null;
  currentOrientation = null;
  selectedTreatment = null;
}
function loginGuest() {
  activeIdentity = { kind: 'guest', id: 'guest', name: 'Invitado' };
  writeSession(activeIdentity, false);
  loadUserState();
}
function setAuthFeedback(id, message = '', success = false) {
  const box = $(id);
  if (!box) return;
  box.textContent = message;
  box.classList.toggle('show', Boolean(message));
  box.classList.toggle('success', Boolean(message) && success);
}
function shakeAuthCard() {
  const card = $('#auth-card');
  if (!card) return;
  card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
}
function toast(message, type = '') {
  const el = $('#app-toast');
  if (!el) return;
  el.textContent = message;
  el.className = `app-toast show ${type}`.trim();
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.className = 'app-toast'; }, 2600);
}
function setAuthMode(mode) {
  const switcher = $('.auth-mode-switch');
  if (switcher) {
    switcher.classList.toggle('register', mode === 'register');
    switcher.classList.toggle('reset', mode === 'reset');
  }
  $$('[data-auth-mode]').forEach((btn) => {
    const active = btn.dataset.authMode === mode && mode !== 'reset';
    if (btn.closest('.auth-mode-switch')) {
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    }
  });
  $$('[data-auth-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.authPanel === mode));
  setAuthFeedback('#login-feedback'); setAuthFeedback('#register-feedback'); setAuthFeedback('#reset-feedback');
}
async function authSuccess(title) {
  const layer = $('#auth-success');
  if (!layer) return;
  $('#auth-success-title').textContent = title;
  layer.classList.add('show');
  await new Promise((resolve) => setTimeout(resolve, 650));
  layer.classList.remove('show');
}
async function createAccount({ name, email, username, password }) {
  const normalizedEmail = normalizeIdentifier(email);
  const normalizedUsername = normalizeIdentifier(username);
  if (!name.trim()) throw new Error('Escribe tu nombre o alias.');
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('Usa un correo válido.');
  if (!usernameIsValid(normalizedUsername)) throw new Error('El usuario debe tener 3–30 caracteres: letras, números, punto, guion o guion bajo.');
  if (getAccounts().some((a) => a.email === normalizedEmail)) throw new Error('Ese correo ya tiene una cuenta en este dispositivo.');
  if (getAccounts().some((a) => a.username === normalizedUsername)) throw new Error('Ese nombre de usuario ya está ocupado en este dispositivo.');
  if (passwordStrength(password) < 2) throw new Error('La clave es demasiado débil. Usa al menos 8 caracteres y combínalos.');
  const salt = randomSalt();
  const passwordHash = await derivePassword(password, salt);
  const account = { id: crypto.randomUUID(), name: name.trim().slice(0, 60), email: normalizedEmail, username: normalizedUsername, salt, passwordHash, createdAt: new Date().toISOString(), passwordUpdatedAt: new Date().toISOString() };
  setAccounts([...getAccounts(), account]);
  return account;
}
async function verifyAccount(identifier, password) {
  const account = findAccount(identifier);
  if (!account) return null;
  const candidate = await derivePassword(password, account.salt);
  return candidate === account.passwordHash ? account : null;
}

function enterExperience() {
  const next = store.get('dlorgia:onboardingComplete', false) ? 'home' : 'onboarding';
  if (next === 'onboarding') applyOnboarding();
  navStack = [next];
  show(next, false);
}

function setNavActive(id) {
  $$('.bottom-nav [data-nav]').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === id));
}

function applyGuideToCalculator() {
  const guide = getPersonalGuide();
  if (!guide) return;
  const preferredId = selectedTreatment || guide.matches?.[0]?.id;
  if (preferredId && $('#treatment-select')) $('#treatment-select').value = preferredId;
  if (guide.profile?.goal && $('#goal-select')) $('#goal-select').value = guide.profile.goal;
  if ($('#sensitivity-select') && guide.profile?.sensitivity) $('#sensitivity-select').value = guide.profile.sensitivity;
  if ($('#availability-select')) $('#availability-select').value = ['sin_pausa','corta'].includes(guide.profile?.recovery) ? 'rapida' : 'flexible';
}

function applyGuideToEvaluation() {
  const guide = getPersonalGuide();
  if (!guide) return;
  const top = catalog.find((x) => x.id === (selectedTreatment || guide.matches?.[0]?.id));
  const interest = $('#eval-interest');
  if (interest && top && (!interest.value || interest.value === 'Orientación general')) interest.value = `Orientador Personal · ${top.name}`;
}

function show(id, push = true) {
  if (!document.getElementById(id)) return;
  $$('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
  if (push && navStack.at(-1) !== id) navStack.push(id);
  setNavActive(id);
  $('.app-shell')?.classList.toggle('entry-mode', id === 'login');
  setAmbientScene(id);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'home') renderHome();
  if (id === 'guide') renderGuide();
  if (id === 'summary') renderSummary();
  if (id === 'followup') renderFollowUp();
  if (id === 'portal') renderPortal();
  if (id === 'catalog') renderCatalog();
  if (id === 'assistant') renderAdvisor();
  if (id === 'calculator') applyGuideToCalculator();
  if (id === 'evaluation') applyGuideToEvaluation();
}

function goBack() {
  if (navStack.length > 1) navStack.pop();
  show(navStack.at(-1) || 'home', false);
}

function rememberOrientation(result) {
  currentOrientation = result;
  selectedTreatment = result.treatment.id;
  store.set('dlorgia:lastOrientation', result);

  const history = store.get('dlorgia:history', []);
  const item = {
    id: `${Date.now()}`,
    createdAt: result.generatedAt || new Date().toISOString(),
    treatmentId: result.treatment.id,
    treatment: result.treatment.name,
    goal: result.goal,
    summary: result.goalNote
  };
  store.set('dlorgia:history', [item, ...history].slice(0, 20));
}

function categoryIcon(category) {
  const name = ({ Piel: 'sparkles', Corporal: 'heart-pulse', Capilar: 'leaf', Depilación: 'scan', Tatuajes: 'target' })[category] || 'sparkles';
  return icon(name);
}

function renderHome() {
  const box = $('#home-continuity');
  if (!box) return;
  const profile = getProfile();
  const guide = getPersonalGuide();
  const greeting = $('#home-personal-greeting');
  if (greeting) {
    greeting.textContent = profile.name ? `Hola, ${profile.name}. Tu recorrido sigue aquí.` : '';
    greeting.classList.toggle('hidden', !profile.name);
  }
  const statePill = $('#home-status-pill span');
  const evaluation = store.get('dlorgia:lastEvaluation');
  if (statePill) {
    if (evaluation?.date) statePill.textContent = `Evaluación programada · ${formatShortDate(evaluation.date, evaluation.time || '')}`;
    else if (currentOrientation?.treatment?.name) statePill.textContent = `Continúa · ${currentOrientation.treatment.name}`;
    else if (guide?.matches?.length) statePill.textContent = `Orientador listo · ${guide.matches[0].name}`;
    else if (store.get('dlorgia:onboardingComplete', false)) statePill.textContent = 'Tu recorrido ya está personalizado';
    else statePill.textContent = 'Orientación + acompañamiento';
  }

  const guideResume = $('#home-guide-resume');
  if (guideResume) {
    if (guide?.matches?.length) {
      const top = guide.matches[0];
      guideResume.classList.remove('hidden');
      guideResume.innerHTML = `<span class="guide-resume-icon">${icon('compass')}</span><span><small>ORIENTADOR PERSONAL · ${escapeHtml(guide.guide?.name || 'D’Lorgia')}</small><b>Tu camino principal para explorar: ${escapeHtml(top.name)}</b><em>${escapeHtml(top.affinity)} afinidad con tus preferencias · ${escapeHtml(guide.profile?.goalLabel || '')}</em></span><button id="resume-guide">Ver perfil →</button>`;
      $('#resume-guide').onclick = () => { guideStep = 'result'; show('guide'); };
    } else {
      guideResume.classList.add('hidden');
      guideResume.innerHTML = '';
    }
  }

  renderPlan();
  if (!currentOrientation) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `
    <span class="continuity-icon">${categoryIcon(currentOrientation.treatment.category)}</span>
    <span><b>Continúa: ${escapeHtml(currentOrientation.treatment.name)}</b><small>${escapeHtml(currentOrientation.goalNote)}</small></span>
    <button id="continue-current" aria-label="Continuar orientación">→</button>`;
  $('#continue-current').onclick = () => show('summary');
}

const GUIDE_STYLES_UI = {
  clara: { name: 'Clara', label: 'Directa', icon: 'arrow-right', text: 'Voy al punto. Te muestro coincidencias claras y qué revisar después.' },
  alma: { name: 'Alma', label: 'Acompañante', icon: 'heart', text: 'Vamos paso a paso. Te explico el recorrido con calma y contexto.' },
  nexo: { name: 'Nexo', label: 'Analítico', icon: 'target', text: 'Comparo criterios y te explico por qué cada opción aparece.' }
};

const GUIDE_AREA_OPTIONS = [
  ['Piel','Piel / rostro','sparkles'], ['Corporal','Cuerpo','heart-pulse'], ['Capilar','Cabello','leaf'],
  ['Depilación','Depilación','scan'], ['Tatuajes','Tatuajes','target'], ['Todas','Aún no lo sé','compass']
];
const GUIDE_GOALS = [
  ['cuidado','Cuidado general'], ['textura','Mejorar textura'], ['manchas','Apariencia de manchas'],
  ['firmeza','Firmeza'], ['lineas','Líneas de expresión'], ['hidratacion','Hidratación / confort'], ['brotes','Brotes / acné']
];
const GUIDE_PRIORITIES = [
  ['resultados','Entender resultados'], ['recuperacion','Recuperación corta'], ['baja_intervencion','Menor intervención'],
  ['cuidados','Cuidados claros'], ['acompanamiento','Acompañamiento']
];

function guideDefaults() {
  const saved = getPersonalGuide();
  if (saved?.profile) return {
    guideStyle: saved.guide?.id || 'alma', area: saved.profile.area || 'Todas', goal: saved.profile.goal || 'cuidado',
    priorities: [...(saved.profile.priorities || [])], recovery: saved.profile.recovery || 'flexible',
    intensity: saved.profile.intensity || 'abierta', sensitivity: saved.profile.sensitivity || 'no_indicado',
    treatmentId: saved.profile.treatmentId || ''
  };
  const prefs = getPreferences();
  const areaMap = { piel: 'Piel', corporal: 'Corporal', capilar: 'Capilar', depilacion: 'Depilación', tatuajes: 'Tatuajes', explorar: 'Todas' };
  return {
    guideStyle: 'alma', area: areaMap[prefs.interest] || 'Todas', goal: 'cuidado',
    priorities: prefs.priority ? [prefs.priority] : [],
    recovery: prefs.priority === 'recuperacion' ? 'corta' : 'flexible', intensity: 'abierta',
    sensitivity: 'no_indicado', treatmentId: selectedTreatment || ''
  };
}

function resetGuideDraft(useSaved = true) {
  guideDraft = useSaved ? guideDefaults() : { guideStyle: 'alma', area: 'Todas', goal: 'cuidado', priorities: [], recovery: 'flexible', intensity: 'abierta', sensitivity: 'no_indicado', treatmentId: '' };
}

function guideProgress(step) {
  const progress = $('#guide-progress');
  if (!progress) return;
  const index = step === 'result' ? 5 : Number(step || 0);
  const labels = ['Estilo','Área','Objetivo','Prioridades','Preferencias','Tu ruta'];
  progress.innerHTML = labels.map((label, i) => `<span class="${i < index ? 'done' : i === index ? 'active' : ''}"><i>${i < index ? '✓' : i + 1}</i><small>${label}</small></span>`).join('');
}

function guideBack() {
  if (guideStep === 'result') guideStep = 4;
  else guideStep = Math.max(0, Number(guideStep || 0) - 1);
  renderGuide();
}

function guideNext(step) { guideStep = step; renderGuide(); }

function renderGuide() {
  const box = $('#guide-content');
  if (!box) return;
  if (guideStep === null) {
    resetGuideDraft(true);
    guideStep = getPersonalGuide() ? 'result' : 0;
  }
  guideProgress(guideStep);
  const saved = getPersonalGuide();

  if (guideStep === 'result' && saved) {
    renderGuideResult(saved);
    return;
  }

  const style = GUIDE_STYLES_UI[guideDraft.guideStyle] || GUIDE_STYLES_UI.alma;
  const sharedHead = `<div class="guide-companion"><span class="guide-avatar guide-${escapeHtml(guideDraft.guideStyle)}">${icon(style.icon)}</span><span><small>${escapeHtml(style.label.toUpperCase())}</small><b>${escapeHtml(style.name)}</b><em>${escapeHtml(style.text)}</em></span></div>`;

  if (guideStep === 0) {
    box.innerHTML = `<div class="guide-stage">\
      <div class="guide-stage-copy"><p class="eyebrow">PASO 1 · ESTILO DE ACOMPAÑAMIENTO</p><h3>¿Cómo prefieres que te oriente?</h3><p class="muted">Los tres usan la misma información y las mismas reglas. Solo cambia la forma de acompañarte.</p></div>\
      <div class="guide-personas">${Object.entries(GUIDE_STYLES_UI).map(([id,item]) => `<button class="guide-persona ${guideDraft.guideStyle===id?'selected':''}" data-guide-style="${id}"><span class="guide-avatar guide-${id}">${icon(item.icon)}</span><span><small>${escapeHtml(item.label)}</small><b>${escapeHtml(item.name)}</b><em>${escapeHtml(item.text)}</em></span><i>${guideDraft.guideStyle===id?'✓':'→'}</i></button>`).join('')}</div>\
      <div class="guide-actions"><button class="primary" id="guide-style-next">Continuar con ${escapeHtml(style.name)} →</button></div></div>`;
    $$('[data-guide-style]').forEach((btn) => btn.onclick = () => { guideDraft.guideStyle = btn.dataset.guideStyle; renderGuide(); });
    $('#guide-style-next').onclick = () => guideNext(1);
    return;
  }

  if (guideStep === 1) {
    box.innerHTML = `${sharedHead}<div class="guide-stage"><div class="guide-stage-copy"><p class="eyebrow">PASO 2 · ÁREA</p><h3>¿Qué quieres explorar primero?</h3><p class="muted">Si todavía no lo tienes claro, elige “Aún no lo sé”.</p></div><div class="guide-choice-grid">${GUIDE_AREA_OPTIONS.map(([id,label,ico]) => `<button class="guide-choice ${guideDraft.area===id?'selected':''}" data-guide-area="${escapeHtml(id)}">${icon(ico)}<b>${escapeHtml(label)}</b><span>${guideDraft.area===id?'Seleccionado':'Explorar'}</span></button>`).join('')}</div><div class="guide-actions"><button class="secondary" id="guide-back">← Atrás</button><button class="primary" id="guide-area-next">Continuar →</button></div></div>`;
    $$('[data-guide-area]').forEach((btn) => btn.onclick = () => { guideDraft.area = btn.dataset.guideArea; renderGuide(); });
    $('#guide-back').onclick = guideBack; $('#guide-area-next').onclick = () => guideNext(2); return;
  }

  if (guideStep === 2) {
    box.innerHTML = `${sharedHead}<div class="guide-stage"><div class="guide-stage-copy"><p class="eyebrow">PASO 3 · OBJETIVO</p><h3>¿Qué quieres comprender o mejorar?</h3><p class="muted">Esto sirve para cruzar tu objetivo con las fichas del catálogo, no para diagnosticar.</p></div><div class="guide-goals">${GUIDE_GOALS.map(([id,label]) => `<button class="guide-goal ${guideDraft.goal===id?'selected':''}" data-guide-goal="${id}"><span>${guideDraft.goal===id?'✓':'◇'}</span><b>${escapeHtml(label)}</b></button>`).join('')}</div><div class="guide-actions"><button class="secondary" id="guide-back">← Atrás</button><button class="primary" id="guide-goal-next">Continuar →</button></div></div>`;
    $$('[data-guide-goal]').forEach((btn) => btn.onclick = () => { guideDraft.goal = btn.dataset.guideGoal; renderGuide(); });
    $('#guide-back').onclick = guideBack; $('#guide-goal-next').onclick = () => guideNext(3); return;
  }

  if (guideStep === 3) {
    box.innerHTML = `${sharedHead}<div class="guide-stage"><div class="guide-stage-copy"><p class="eyebrow">PASO 4 · PRIORIDADES</p><h3>¿Qué importa más para ti?</h3><p class="muted">Elige hasta 3. El Orientador las conservará para Tratamientos, Asesor y Evaluación.</p></div><div class="guide-priorities">${GUIDE_PRIORITIES.map(([id,label]) => `<button class="guide-priority ${guideDraft.priorities.includes(id)?'selected':''}" data-guide-priority="${id}"><i>${guideDraft.priorities.includes(id)?'✓':'+'}</i><b>${escapeHtml(label)}</b></button>`).join('')}</div><p class="guide-selection-count">${guideDraft.priorities.length}/3 prioridades seleccionadas</p><div class="guide-actions"><button class="secondary" id="guide-back">← Atrás</button><button class="primary" id="guide-priority-next">Continuar →</button></div></div>`;
    $$('[data-guide-priority]').forEach((btn) => btn.onclick = () => {
      const id = btn.dataset.guidePriority; const set = new Set(guideDraft.priorities);
      if (set.has(id)) set.delete(id); else if (set.size < 3) set.add(id); else return toast('Puedes elegir hasta 3 prioridades.');
      guideDraft.priorities = [...set]; renderGuide();
    });
    $('#guide-back').onclick = guideBack; $('#guide-priority-next').onclick = () => guideNext(4); return;
  }

  if (guideStep === 4) {
    const treatmentOptions = ['<option value="">No tengo uno en mente</option>', ...catalog.map((x) => `<option value="${escapeHtml(x.id)}" ${guideDraft.treatmentId===x.id?'selected':''}>${escapeHtml(x.category)} · ${escapeHtml(x.name)}</option>`)].join('');
    box.innerHTML = `${sharedHead}<div class="guide-stage"><div class="guide-stage-copy"><p class="eyebrow">PASO 5 · PREFERENCIAS PRÁCTICAS</p><h3>Ajustemos el recorrido a tu rutina</h3><p class="muted">Estas respuestas solo ajustan la afinidad del prototipo. No sustituyen criterios profesionales.</p></div><form id="guide-practical-form" class="panel form-grid guide-practical">\
      <label>Tiempo de recuperación que prefieres<select id="guide-recovery"><option value="sin_pausa" ${guideDraft.recovery==='sin_pausa'?'selected':''}>Idealmente sin pausa</option><option value="corta" ${guideDraft.recovery==='corta'?'selected':''}>1–2 días / recuperación corta</option><option value="flexible" ${guideDraft.recovery==='flexible'?'selected':''}>Soy flexible</option></select></label>\
      <label>Intensidad que prefieres explorar<select id="guide-intensity"><option value="minima" ${guideDraft.intensity==='minima'?'selected':''}>Lo menos invasivo posible</option><option value="intermedia" ${guideDraft.intensity==='intermedia'?'selected':''}>Intermedia</option><option value="abierta" ${guideDraft.intensity==='abierta'?'selected':''}>Estoy abierto/a a comparar</option></select></label>\
      <label>Sensibilidad conocida<select id="guide-sensitivity"><option value="no_indicado" ${guideDraft.sensitivity==='no_indicado'?'selected':''}>Prefiero no indicarlo</option><option value="normal" ${guideDraft.sensitivity==='normal'?'selected':''}>Sin sensibilidad especial conocida</option><option value="sensible" ${guideDraft.sensitivity==='sensible'?'selected':''}>Tengo piel/zona sensible</option></select></label>\
      <label>¿Ya quieres comparar algo?<select id="guide-treatment">${treatmentOptions}</select></label>\
      <div class="guide-actions form-actions"><button class="secondary" id="guide-back" type="button">← Atrás</button><button class="primary" type="submit">Construir mi perfil →</button></div></form></div>`;
    $('#guide-back').onclick = guideBack;
    $('#guide-practical-form').onsubmit = submitPersonalGuide;
  }
}

async function submitPersonalGuide(event) {
  event.preventDefault();
  if (guideBusy) return;
  guideBusy = true;
  guideDraft.recovery = $('#guide-recovery').value;
  guideDraft.intensity = $('#guide-intensity').value;
  guideDraft.sensitivity = $('#guide-sensitivity').value;
  guideDraft.treatmentId = $('#guide-treatment').value;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = 'Comparando tu perfil…'; }
  try {
    const result = await api('/api/personal-guide', { method: 'POST', body: JSON.stringify(guideDraft) });
    setPersonalGuide(result);
    guideStep = 'result';
    if (!selectedTreatment && result.matches?.[0]?.id) selectedTreatment = result.matches[0].id;
    renderGuide(); renderHome(); renderCatalog(); renderAdvisor(); renderPortal(); renderFollowUp();
    toast('Tu perfil del Orientador Personal quedó guardado.', 'success');
  } catch (error) {
    toast(error.message || 'No pude construir el perfil.');
    if (submit) { submit.disabled = false; submit.textContent = 'Construir mi perfil →'; }
  } finally { guideBusy = false; }
}

function renderGuideResult(result) {
  const box = $('#guide-content');
  if (!box) return;
  const guide = GUIDE_STYLES_UI[result.guide?.id] || GUIDE_STYLES_UI.alma;
  const top = result.matches?.[0];
  const profile = result.profile || {};
  const priorityChips = (profile.priorityLabels || []).map((x) => `<span>${escapeHtml(x)}</span>`).join('');
  box.innerHTML = `<div class="guide-result">\
    <div class="guide-result-hero"><span class="guide-avatar guide-${escapeHtml(result.guide?.id || 'alma')}">${icon(guide.icon)}</span><div><p class="eyebrow">TU PERFIL DE ORIENTACIÓN</p><h3>${escapeHtml(guide.name)} organizó tu ruta</h3><p>${escapeHtml(result.guide?.intro || guide.text)}</p></div><span class="guide-result-check">✓</span></div>\
    <div class="guide-profile-grid"><div><small>Área</small><b>${escapeHtml(profile.areaLabel || 'Exploratoria')}</b></div><div><small>Objetivo</small><b>${escapeHtml(profile.goalLabel || 'Cuidado general')}</b></div><div class="wide"><small>Prioridades</small><span class="guide-profile-chips">${priorityChips || '<span>Explorar con calma</span>'}</span></div></div>\
    <div class="guide-caution">${icon('shield')}<p>${escapeHtml(result.caution || '')}</p></div>\
    <div class="section-minihead"><div><p class="eyebrow">CAMINOS PARA EXPLORAR</p><h3>Ordenados por afinidad con tus preferencias</h3></div></div>\
    <div class="guide-matches">${(result.matches || []).map((m) => `<article class="guide-match-card ${m.rank===1?'top':''}"><div class="guide-match-head"><span class="match-rank">${m.rank}</span><span><small>${escapeHtml(m.category)}</small><b>${escapeHtml(m.name)}</b></span><em>${escapeHtml(m.affinity)}</em></div><p>${escapeHtml(m.short)}</p><div class="affinity-track"><span style="width:${Math.max(18,Math.min(100,m.score))}%"></span></div><div class="guide-why"><b>Por qué aparece</b>${list(m.reasons)}</div><div class="guide-consider"><b>A considerar</b>${list(m.considerations)}</div><div class="guide-card-actions"><button class="primary" data-guide-open="${escapeHtml(m.id)}">Explorar tratamiento</button><button class="secondary" data-guide-ask="${escapeHtml(m.id)}">Preguntar al Asesor</button></div></article>`).join('')}</div>\
    <div class="guide-route"><p class="eyebrow">TU RUTA EN D’LORGIA</p><h3>El Orientador conecta lo que ya existe</h3><div class="guide-route-grid"><button data-nav="catalog">${icon('scan')}<b>Tratamientos</b><span>Compara tus coincidencias y revisa fichas.</span></button><button id="guide-route-advisor">${icon('sparkles')}<b>Asesor</b><span>Pregunta usando este perfil como contexto.</span></button><button id="guide-route-evaluation">${icon('stethoscope')}<b>Evaluación</b><span>Confirma profesionalmente el camino.</span></button><button data-nav="followup">${icon('bell')}<b>Seguimiento</b><span>Organiza recordatorios y continuidad.</span></button></div></div>\
    <div class="notice">${escapeHtml(result.disclaimer || '')}</div>\
    <div class="guide-actions"><button class="secondary" id="guide-adjust">Ajustar respuestas</button><button class="ghost" id="guide-restart">Empezar de nuevo</button></div></div>`;

  $$('[data-guide-open]').forEach((btn) => btn.onclick = () => openDetail(btn.dataset.guideOpen));
  $$('[data-guide-ask]').forEach((btn) => btn.onclick = () => { selectedTreatment = btn.dataset.guideAsk; advisorFocus = 'orientacion'; show('assistant'); });
  $$('#guide-content [data-nav]').forEach((btn) => btn.onclick = () => show(btn.dataset.nav));
  $('#guide-route-advisor').onclick = () => { if (top?.id) selectedTreatment = top.id; advisorFocus = 'orientacion'; show('assistant'); };
  $('#guide-route-evaluation').onclick = () => openGuideEvaluation(top?.id);
  $('#guide-adjust').onclick = () => { resetGuideDraft(true); guideStep = 1; renderGuide(); };
  $('#guide-restart').onclick = () => { resetGuideDraft(false); guideStep = 0; renderGuide(); };
}

function openGuideEvaluation(treatmentId = '') {
  const match = catalog.find((x) => x.id === treatmentId) || catalog.find((x) => x.id === getPersonalGuide()?.matches?.[0]?.id);
  if (match && $('#eval-interest')) $('#eval-interest').value = `Orientador Personal · ${match.name}`;
  show('evaluation');
}

function guideMatchFor(treatmentId) {
  return getPersonalGuide()?.matches?.find((x) => x.id === treatmentId) || null;
}

function renderCategoryFilters() {
  if (!$('#category-filters')) return;
  const cats = ['Todas', ...new Set(catalog.map((x) => x.category))];
  $('#category-filters').innerHTML = cats.map((cat) => `<button class="${cat === activeCategory ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('');
  $$('[data-category]').forEach((btn) => btn.onclick = () => {
    activeCategory = btn.dataset.category;
    renderCategoryFilters();
    renderCatalog();
  });
}

function renderCatalog() {
  if (!$('#catalog-list')) return;
  renderCategoryFilters();
  const items = activeCategory === 'Todas' ? catalog : catalog.filter((x) => x.category === activeCategory);
  const guide = getPersonalGuide();
  const matchMap = new Map((guide?.matches || []).map((m) => [m.id, m]));
  $('#catalog-list').innerHTML = items.length ? items.map((x) => {
    const match = matchMap.get(x.id);
    return `
    <button class="treatment-card ${match ? 'guide-ranked' : ''}" data-treatment="${escapeHtml(x.id)}">
      <span class="avatar">${categoryIcon(x.category)}</span>
      <span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.short)}</small>${match ? `<em class="guide-match-badge">${icon('compass','ui-icon mini')} #${match.rank} · Afinidad ${escapeHtml(match.affinity.toLowerCase())}</em>` : ''}</span>
      <span class="card-arrow">${icon('chevron-right')}</span>
    </button>`;
  }).join('') : '<div class="empty">No hay tratamientos en esta categoría.</div>';
  $$('[data-treatment]').forEach((btn) => btn.onclick = () => openDetail(btn.dataset.treatment));
}

function toggleSavedTreatment(id) {
  const saved = getSavedTreatments();
  const exists = saved.includes(id);
  setSavedTreatments(exists ? saved.filter((x) => x !== id) : [id, ...saved].slice(0, 12));
  openDetail(id, false);
}

function openDetail(id, push = true) {
  const treatment = catalog.find((x) => x.id === id);
  if (!treatment) return;
  selectedTreatment = id;
  const isSaved = getSavedTreatments().includes(id);
  const guideMatch = guideMatchFor(id);
  $('#detail-name').textContent = treatment.name;
  $('#detail-content').innerHTML = `
    <div class="detail-hero">
      <p class="eyebrow">${escapeHtml(treatment.category)}</p>
      <h3>${escapeHtml(treatment.name)}</h3>
      <p>${escapeHtml(treatment.description)}</p>
    </div>
    ${guideMatch ? `<div class="panel detail-guide-match"><div class="panel-title"><span class="panel-icon">${icon('compass')}</span><div><p class="eyebrow">ORIENTADOR PERSONAL · #${guideMatch.rank}</p><h3>Afinidad ${escapeHtml(guideMatch.affinity.toLowerCase())} con tu perfil</h3></div></div><div class="affinity-track"><span style="width:${Math.max(18,Math.min(100,guideMatch.score))}%"></span></div><div class="guide-why compact"><b>Por qué aparece en tu ruta</b>${list(guideMatch.reasons)}</div><button class="ghost full" id="detail-guide-profile">Revisar mi perfil del Orientador</button></div>` : `<div class="panel detail-guide-empty"><div class="panel-title"><span class="panel-icon">${icon('compass')}</span><div><p class="eyebrow">ORIENTADOR PERSONAL</p><h3>¿Quieres comparar esta opción con tus prioridades?</h3></div></div><p class="muted">El Orientador puede cruzar este tratamiento con tu objetivo, recuperación e intensidad preferida.</p><button class="secondary full" id="detail-guide-start">Usar en Orientador Personal</button></div>`}
    <div class="panel"><div class="panel-title"><span class="panel-icon">${icon('target')}</span><div><p class="eyebrow">OBJETIVO</p><h3>¿Qué busca orientar?</h3></div></div><p class="muted">${escapeHtml(treatment.objective || treatment.short)}</p></div>
    <div class="action-stack">
      <button class="primary" id="detail-calc">Orientar mis expectativas →</button>
      <button class="secondary" id="detail-assistant">Consultar a mi asesor</button>
      <button class="secondary detail-save ${isSaved ? 'is-saved' : ''}" id="detail-save">${icon(isSaved ? 'circle-check' : 'heart')} ${isSaved ? 'Guardado en Mi espacio' : 'Guardar para revisar'}</button>
    </div>`;
  if ($('#treatment-select')) $('#treatment-select').value = id;
  $('#detail-calc').onclick = () => show('calculator');
  $('#detail-assistant').onclick = () => { advisorFocus = 'orientacion'; show('assistant'); };
  $('#detail-save').onclick = () => toggleSavedTreatment(id);
  if ($('#detail-guide-profile')) $('#detail-guide-profile').onclick = () => { guideStep = 'result'; show('guide'); };
  if ($('#detail-guide-start')) $('#detail-guide-start').onclick = () => { resetGuideDraft(true); guideDraft.treatmentId = id; guideStep = 1; show('guide'); };
  show('detail', push);
}

function renderOrientation(result) {
  rememberOrientation(result);
  const out = $('#orientation-result');
  out.classList.remove('hidden');
  out.innerHTML = `
    <div class="result-hero">
      <p class="eyebrow">TU ORIENTACIÓN</p><h3>${escapeHtml(result.treatment.name)}</h3><p>${escapeHtml(result.goalNote)}</p>
    </div>
    <div class="metric-grid">
      <div class="metric"><b>Resultados</b><span>${escapeHtml(result.expectations.resultWindow)}</span></div>
      <div class="metric"><b>Recuperación</b><span>${escapeHtml(result.expectations.recovery)}</span></div>
      <div class="metric"><b>Sesiones</b><span>${escapeHtml(result.expectations.sessions)}</span></div>
      <div class="metric"><b>Duración</b><span>${escapeHtml(result.expectations.duration)}</span></div>
    </div>
    ${result.personalization?.length ? `<div class="list-card"><h4>Personalización</h4>${list(result.personalization)}</div>` : ''}
    <div class="list-card"><h4>Qué puedes esperar</h4>${list(result.expectations.results)}</div>
    <div class="list-card"><h4>Antes del tratamiento</h4>${list(result.care.before)}</div>
    <div class="list-card"><h4>Después del tratamiento</h4>${list(result.care.after)}</div>
    <div class="list-card"><h4>Seguimiento sugerido</h4>${list(result.followUp)}</div>
    <div class="notice">${escapeHtml(result.disclaimer)}</div>
    <div class="action-stack">
      <button class="primary" id="save-summary">Ver mi resumen →</button>
      <button class="secondary" id="ask-assistant">Preguntar a mi asesor</button>
      <button class="secondary" id="calc-followup">Crear seguimiento</button>
      <button class="secondary" id="calc-evaluation">Solicitar evaluación</button>
    </div>`;
  $('#save-summary').onclick = () => show('summary');
  $('#ask-assistant').onclick = () => { advisorFocus = 'orientacion'; show('assistant'); };
  $('#calc-followup').onclick = () => show('followup');
  $('#calc-evaluation').onclick = () => show('evaluation');
  if ($('#eval-interest')) $('#eval-interest').value = result.treatment.name;
  renderHome();
}

function renderSummary() {
  const box = $('#summary-content');
  if (!box) return;
  if (!currentOrientation) {
    box.innerHTML = `<div class="empty">Aún no tienes una orientación guardada.<br><br><button class="primary" id="start-orientation">Comenzar orientación</button></div>`;
    $('#start-orientation').onclick = () => show('calculator');
    return;
  }
  box.innerHTML = `
    <p class="eyebrow">TRATAMIENTO</p><h3>${escapeHtml(currentOrientation.treatment.name)}</h3><p>${escapeHtml(currentOrientation.treatment.description)}</p><hr>
    <b>Objetivo</b><p>${escapeHtml(currentOrientation.goalNote)}</p>
    <b>Resultados esperados</b>${list(currentOrientation.expectations.results)}
    <b>Ventana orientativa</b><p>${escapeHtml(currentOrientation.expectations.resultWindow)}</p>
    <b>Recuperación</b><p>${escapeHtml(currentOrientation.expectations.recovery)}</p>
    <b>Sesiones</b><p>${escapeHtml(currentOrientation.expectations.sessions)}</p>
    <b>Cuidados</b>${list(currentOrientation.care.after)}
    <div class="notice">${escapeHtml(currentOrientation.disclaimer)}</div>`;
}

function summaryText() {
  if (!currentOrientation) return 'D’Lorgia Orienta\n\nAún no existe una orientación guardada.';
  const o = currentOrientation;
  return [
    'D’LORGIA ORIENTA — RESUMEN DEL PROTOTIPO', '',
    `Tratamiento: ${o.treatment.name}`, `Categoría: ${o.treatment.category}`, `Objetivo: ${o.goalNote}`, '',
    `Resultados esperados: ${o.expectations.results.join(' | ')}`, `Ventana orientativa: ${o.expectations.resultWindow}`,
    `Recuperación: ${o.expectations.recovery}`, `Sesiones: ${o.expectations.sessions}`, `Duración: ${o.expectations.duration}`, '',
    `Cuidados posteriores: ${o.care.after.join(' | ')}`, '', o.disclaimer
  ].join('\n');
}

function downloadSummary() {
  if (!currentOrientation) return alert('Primero genera una orientación.');
  const blob = new Blob([summaryText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dlorgia-orienta-${currentOrientation.treatment.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAdvisor() {
  const profile = getProfile();
  const guide = getPersonalGuide();
  const treatment = catalog.find((x) => x.id === selectedTreatment) || currentOrientation?.treatment || (guide?.matches?.[0] ? catalog.find((x) => x.id === guide.matches[0].id) : null);
  const greeting = $('#advisor-greeting');
  if (greeting) greeting.textContent = profile.name
    ? `${profile.name}, te ayudo a entender tu proceso y organizar tu siguiente paso.`
    : 'Te ayudo a entender tu proceso y organizar tu siguiente paso.';

  const context = $('#advisor-context');
  if (!context) return;
  const prefs = getPreferences();
  const recent = getAdvisorMemory().filter((x) => x.role === 'user').slice(-2);
  const guideMatch = treatment ? guideMatchFor(treatment.id) : null;
  if (treatment) {
    context.innerHTML = `<div class="context-row"><span><small>Contexto actual</small><b>${escapeHtml(treatment.name)}</b></span><button class="secondary" id="change-context" type="button">Cambiar</button></div>
      ${guide ? `<div class="advisor-guide-context"><span>${icon('compass')}</span><div><small>Orientador Personal · ${escapeHtml(guide.guide?.name || 'D’Lorgia')}</small><b>${escapeHtml(guide.profile?.goalLabel || 'Perfil de orientación')}</b><p>${guideMatch ? `Este tratamiento aparece #${guideMatch.rank} con afinidad ${escapeHtml(guideMatch.affinity.toLowerCase())}.` : 'El Asesor está usando tus prioridades como contexto adicional.'}</p></div><button id="advisor-open-guide" class="ghost" type="button">Ver perfil</button></div>` : ''}
      <div class="memory-chips">
        ${prefs.interest ? `<span>Interés: ${escapeHtml(prefs.interest)}</span>` : ''}
        ${prefs.priority ? `<span>Prioridad: ${escapeHtml(prefs.priority)}</span>` : ''}
        ${(guide?.profile?.priorityLabels || []).map((x) => `<span>Orientador: ${escapeHtml(x)}</span>`).join('')}
        ${recent.map((x) => `<span title="Lo dijiste al asesor">“${escapeHtml(x.text.slice(0,52))}${x.text.length>52?'…':''}”</span>`).join('')}
      </div>`;
    $('#change-context').onclick = () => show('catalog');
    if ($('#advisor-open-guide')) $('#advisor-open-guide').onclick = () => { guideStep = 'result'; show('guide'); };
  } else if (guide?.matches?.length) {
    context.innerHTML = `<div class="context-row"><span><small>Contexto actual</small><b>Perfil del Orientador Personal</b></span><button class="secondary" id="choose-guide-top" type="button">Usar primera coincidencia</button></div><div class="memory-chips"><span>Objetivo: ${escapeHtml(guide.profile?.goalLabel || '')}</span>${(guide.profile?.priorityLabels || []).map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>`;
    $('#choose-guide-top').onclick = () => { selectedTreatment = guide.matches[0].id; renderAdvisor(); };
  } else {
    context.innerHTML = `<div class="context-row"><span><small>Contexto actual</small><b>Sin tratamiento seleccionado</b></span><button class="secondary" id="choose-context" type="button">Elegir</button></div><button class="guide-inline-cta" id="advisor-start-guide" type="button">${icon('compass')} No sé qué elegir · Abrir Orientador Personal →</button>`;
    $('#choose-context').onclick = () => show('catalog');
    $('#advisor-start-guide').onclick = () => show('guide');
  }
}

function addBubble(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = `bubble ${who}`;
  el.textContent = text;
  $('#chat-log').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return el;
}

function advisorContextText() {
  const profile = getProfile();
  const guide = getPersonalGuide();
  const treatment = catalog.find((x) => x.id === selectedTreatment);
  const pieces = [
    `Etapa: asesor personalizado`,
    `Enfoque: ${advisorFocus}`,
    treatment ? `Tratamiento seleccionado: ${treatment.name}` : '',
    currentOrientation?.goalNote ? `Objetivo del usuario: ${currentOrientation.goalNote}` : '',
    guide?.profile?.goalLabel ? `Orientador Personal - objetivo: ${guide.profile.goalLabel}` : '',
    guide?.profile?.areaLabel ? `Orientador Personal - área: ${guide.profile.areaLabel}` : '',
    guide?.profile?.priorityLabels?.length ? `Orientador Personal - prioridades: ${guide.profile.priorityLabels.join(', ')}` : '',
    guide?.matches?.length ? `Orientador Personal - caminos para explorar: ${guide.matches.map((m) => `${m.name} (${m.affinity})`).join(', ')}` : '',
    guide?.guide?.name ? `Estilo de acompañamiento elegido: ${guide.guide.name} (${guide.guide.label})` : '',
    profile.name ? `Nombre o alias: ${profile.name}` : '',
    getPreferences().interest ? `Interés inicial: ${getPreferences().interest}` : '',
    getPreferences().priority ? `Prioridad declarada: ${getPreferences().priority}` : '',
    ...getAdvisorMemory().filter((x) => x.role === 'user').slice(-5).map((x) => `Dato dicho por el usuario: ${x.text}`)
  ].filter(Boolean);
  return pieces.join(' | ');
}

async function sendQuestion(text) {
  rememberAdvisor('user', text);
  addBubble(text, 'user');
  const pending = addBubble('', 'bot thinking');
  pending.innerHTML = '<span>Estoy revisando tu contexto</span><span class="typing-dots" aria-label="Consultando"><i></i><i></i><i></i></span>';
  const submit = $('#chat-form button[type="submit"]');
  const chatPanel = $('.chat-panel');
  const meta = $('#last-answer-meta');
  if (meta) meta.classList.add('hidden');
  if (chatPanel) chatPanel.classList.add('is-thinking');
  if (submit) { submit.disabled = true; submit.classList.add('loading'); submit.innerHTML = '<span>Consultando</span>'; }

  try {
    const data = await api('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message: text, context: advisorContextText() })
    });
    pending.classList.remove('thinking');
    pending.classList.add('answer-arrive');
    pending.textContent = data.answer || 'No pude generar una respuesta. Puedes continuar con una evaluación profesional.';
    rememberAdvisor('assistant', pending.textContent);
    if (meta) {
      const label = data.source === 'gemini' ? 'Respuesta asistida por Gemini + reglas D’Lorgia' : 'Respuesta de respaldo local validada para el prototipo';
      meta.textContent = label;
      meta.classList.remove('hidden');
    }
    renderFollowUp();
  } catch (error) {
    pending.classList.remove('thinking');
    pending.classList.add('answer-arrive');
    pending.textContent = 'No pude conectar con el servicio en este momento. La orientación general sigue disponible y puedes continuar con una evaluación profesional.';
    if (meta) {
      meta.textContent = 'Conexión no disponible · modo seguro';
      meta.classList.remove('hidden');
    }
    console.error(error);
  } finally {
    if (chatPanel) chatPanel.classList.remove('is-thinking');
    if (submit) { submit.disabled = false; submit.classList.remove('loading'); submit.innerHTML = '<span>Enviar</span><svg class="ui-icon"><use href="#i-sparkles"></use></svg>'; }
  }
}

function reminderIcon(type) {
  return icon(({ evaluacion:'stethoscope', cuidado:'heart', seguimiento:'bell', personalizado:'sparkles' })[type] || 'clock');
}

function reminderTimestamp(item) {
  if (!item.date) return Number.POSITIVE_INFINITY;
  const time = item.time || '09:00';
  const ts = new Date(`${item.date}T${time}:00`).getTime();
  return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
}

function saveReminder() {
  const title = $('#reminder-title').value.trim();
  const date = $('#reminder-date').value;
  const time = $('#reminder-time').value;
  const type = $('#reminder-type').value;
  if (!title) return alert('Escribe qué quieres recordar.');
  if (!date) return alert('Selecciona una fecha.');

  const items = getReminders();
  items.push({ id: `${Date.now()}`, title, date, time, type, done: false, notified: false, createdAt: new Date().toISOString() });
  items.sort((a, b) => reminderTimestamp(a) - reminderTimestamp(b));
  setReminders(items.slice(0, 30));
  $('#reminder-title').value = '';
  renderFollowUp();
  renderPortal();
}

function toggleReminder(id) {
  const items = getReminders().map((x) => x.id === id ? { ...x, done: !x.done } : x);
  setReminders(items);
  renderFollowUp();
  renderPortal();
}

function deleteReminder(id) {
  setReminders(getReminders().filter((x) => x.id !== id));
  renderFollowUp();
  renderPortal();
}

function renderReminderList(target, limit = 50) {
  if (!target) return;
  const items = getReminders().slice(0, limit);
  if (!items.length) {
    target.innerHTML = '<p class="muted">Aún no tienes recordatorios guardados.</p>';
    return;
  }
  target.innerHTML = items.map((item) => `
    <div class="reminder-item ${item.done ? 'done' : ''}">
      <span class="reminder-icon">${reminderIcon(item.type)}</span>
      <span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(formatShortDate(item.date, item.time))}</small></span>
      <span>
        <button data-reminder-toggle="${item.id}" title="${item.done ? 'Reabrir' : 'Marcar como listo'}">${item.done ? '↺' : '✓'}</button>
        <button data-reminder-delete="${item.id}" title="Eliminar">×</button>
      </span>
    </div>`).join('');
  $$('[data-reminder-toggle]').forEach((btn) => btn.onclick = () => toggleReminder(btn.dataset.reminderToggle));
  $$('[data-reminder-delete]').forEach((btn) => btn.onclick = () => deleteReminder(btn.dataset.reminderDelete));
}

function renderFollowUp() {
  const guide = getPersonalGuide();
  const evalData = store.get('dlorgia:lastEvaluation');
  const reminders = getReminders();
  const hasFollowup = reminders.length > 0;
  const hasAdvisorContinuity = getAdvisorMemory().some((item) => item.role === 'assistant');
  const treatment = currentOrientation?.treatment?.name || guide?.matches?.[0]?.name || 'Orientación pendiente';
  const follow = $('#followup-content');
  if (follow) {
    follow.innerHTML = `
      <div class="panel"><p class="eyebrow">PROCESO ACTUAL</p><h3>${escapeHtml(treatment)}</h3><div class="timeline">
        <div class="timeline-item ${guide ? 'done' : ''}"><span class="dot">${guide ? '✓' : '1'}</span><div><b>Orientador Personal</b><p>${guide ? `Perfil creado con ${escapeHtml(guide.guide?.name || 'D’Lorgia')}; ${guide.matches?.length || 0} caminos quedaron listos para explorar.` : 'Define objetivo, prioridades y preferencias para construir tu ruta.'}</p></div></div>
        <div class="timeline-item ${currentOrientation ? 'done' : ''}"><span class="dot">${currentOrientation ? '✓' : '2'}</span><div><b>Orientación de expectativas</b><p>${currentOrientation ? 'Resumen generado y guardado en tu espacio.' : 'Explora un tratamiento y genera una orientación más específica.'}</p></div></div>
        <div class="timeline-item ${evalData ? 'done' : ''}"><span class="dot">${evalData ? '✓' : '3'}</span><div><b>Evaluación profesional</b><p>${evalData ? `Solicitud preparada para ${escapeHtml(evalData.branch)}${evalData.date ? ` · ${escapeHtml(evalData.date)}` : ''}.` : 'Pendiente. El equipo profesional confirma la decisión clínica.'}</p></div></div>
        <div class="timeline-item ${hasFollowup ? 'done' : ''}"><span class="dot">${hasFollowup ? '✓' : '4'}</span><div><b>Cuidados y seguimiento</b><p>${hasFollowup ? `${reminders.length} recordatorio${reminders.length === 1 ? '' : 's'} guardado${reminders.length === 1 ? '' : 's'} para tu continuidad.` : 'Guarda recordatorios para revisar indicaciones y próximos pasos.'}</p></div></div>
        <div class="timeline-item ${hasAdvisorContinuity ? 'done' : ''}"><span class="dot">${hasAdvisorContinuity ? '✓' : '5'}</span><div><b>Continuidad con el Asesor</b><p>${hasAdvisorContinuity ? 'Ya usaste el Asesor como apoyo para comprender tu proceso.' : 'Registra dudas y vuelve al Asesor cuando necesites comprender mejor el proceso.'}</p></div></div>
      </div></div>`;
  }
  renderReminderList($('#reminders-list'));
}

function renderPortal() {
  const profile = getProfile();
  const guide = getPersonalGuide();
  const accountBox = $('#account-summary');
  if (accountBox) {
    if (activeIdentity?.kind === 'account') {
      const initials = (activeIdentity.name || activeIdentity.username || 'DL').split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase();
      accountBox.innerHTML = `<span class="account-avatar">${escapeHtml(initials || 'DL')}</span><span><b>${escapeHtml(activeIdentity.name || activeIdentity.username)}</b><small>@${escapeHtml(activeIdentity.username)} · ${escapeHtml(activeIdentity.email)}</small></span>`;
    } else {
      accountBox.innerHTML = `<span class="account-avatar">I</span><span><b>Modo invitado</b><small>Los datos usan el espacio local general de este navegador.</small></span>`;
    }
  }
  if ($('#profile-name')) $('#profile-name').value = profile.name || '';
  if ($('#profile-branch')) $('#profile-branch').value = profile.branch || 'huancayo';

  const history = store.get('dlorgia:history', []);
  const savedIds = getSavedTreatments();
  const reminders = getReminders();
  const activeReminders = reminders.filter((x) => !x.done);

  if ($('#portal-stats')) {
    $('#portal-stats').innerHTML = `
      <div class="stat-card"><strong>${history.length}</strong><span>orientaciones</span></div>
      <div class="stat-card"><strong>${savedIds.length}</strong><span>guardados</span></div>
      <div class="stat-card"><strong>${activeReminders.length}</strong><span>alarmas</span></div>`;
  }

  const guideBox = $('#portal-guide-summary');
  if (guideBox) {
    if (guide?.matches?.length) {
      const top = guide.matches[0];
      guideBox.innerHTML = `<div class="portal-guide-card"><span class="guide-avatar guide-${escapeHtml(guide.guide?.id || 'alma')}">${icon(GUIDE_STYLES_UI[guide.guide?.id]?.icon || 'compass')}</span><span><small>${escapeHtml(guide.guide?.name || 'D’Lorgia')} · ${escapeHtml(guide.guide?.label || 'Orientador')}</small><b>${escapeHtml(guide.profile?.goalLabel || 'Perfil de orientación')}</b><em>Primera coincidencia: ${escapeHtml(top.name)} · afinidad ${escapeHtml(top.affinity.toLowerCase())}</em></span></div><div class="guide-profile-chips">${(guide.profile?.priorityLabels || []).map((x) => `<span>${escapeHtml(x)}</span>`).join('')}</div>`;
    } else guideBox.innerHTML = '<p class="muted">Aún no has creado tu perfil del Orientador Personal. Úsalo para conectar tus prioridades con el catálogo.</p>';
  }

  if ($('#history-list')) {
    $('#history-list').innerHTML = history.length
      ? history.slice(0, 8).map((item) => `<div class="history-item"><b>${escapeHtml(item.treatment)}</b><small>${escapeHtml(formatDate(item.createdAt))} · ${escapeHtml(item.summary || '')}</small></div>`).join('')
      : '<p class="muted">Aún no hay orientaciones guardadas.</p>';
  }

  if ($('#saved-list')) {
    const saved = savedIds.map((id) => catalog.find((x) => x.id === id)).filter(Boolean);
    $('#saved-list').innerHTML = saved.length
      ? saved.map((item) => `<div class="saved-item"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.category)} · ${escapeHtml(item.short)}</small></span><button data-open-saved="${item.id}">Ver →</button></div>`).join('')
      : '<p class="muted">Guarda tratamientos desde su pantalla de detalle para revisarlos después.</p>';
    $$('[data-open-saved]').forEach((btn) => btn.onclick = () => openDetail(btn.dataset.openSaved));
  }

  renderReminderList($('#portal-reminders'), 3);
}

async function enableNotifications() {
  if (!('Notification' in window)) return alert('Este navegador no admite notificaciones. Los recordatorios seguirán guardados dentro de la app.');
  const permission = await Notification.requestPermission();
  if (permission === 'granted') alert('Notificaciones activadas para este navegador.');
  else alert('No se otorgó permiso. Los recordatorios seguirán visibles en la app.');
}

function checkDueReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  let changed = false;
  const items = getReminders().map((item) => {
    if (!item.done && !item.notified && reminderTimestamp(item) <= now) {
      try { new Notification('D’Lorgia Orienta', { body: item.title }); } catch {}
      changed = true;
      return { ...item, notified: true };
    }
    return item;
  });
  if (changed) setReminders(items);
}

function setReminderDefaults() {
  if (!$('#reminder-date') || !$('#reminder-time')) return;
  if (!$('#reminder-date').value) {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    $('#reminder-date').value = d.toISOString().slice(0, 10);
  }
  if (!$('#reminder-time').value) $('#reminder-time').value = '09:00';
  if (!$('#reminder-title').value && currentOrientation?.treatment?.name) {
    $('#reminder-title').placeholder = `Revisar cuidados de ${currentOrientation.treatment.name}`;
  }
}


async function loadSchedule() {
  const branch = $('#eval-branch')?.value;
  const date = $('#eval-date')?.value;
  const slotsBox = $('#schedule-slots');
  const title = $('#schedule-title');
  if (!branch || !date || !slotsBox) return;
  $('#eval-time').value = '';
  slotsBox.innerHTML = '<div class="schedule-loading"><span></span><span></span><span></span> Consultando agenda…</div>';
  try {
    const data = await api(`/api/schedule?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(date)}`);
    if (title) title.textContent = data.branchName ? `${data.branchName} · ${date}` : date;
    if (data.closed || !data.slots?.length) {
      slotsBox.innerHTML = `<div class="notice">${escapeHtml(data.reason || 'No hay horarios disponibles para esta fecha.')}</div>`;
      return;
    }
    const available = data.slots.filter((slot) => slot.available);
    slotsBox.innerHTML = available.length
      ? available.map((slot) => `<button type="button" class="slot-btn" data-slot="${slot.time}">${slot.time}</button>`).join('')
      : '<div class="notice">Los horarios de esta fecha ya están ocupados. Prueba otro día.</div>';
    document.querySelectorAll('[data-slot]').forEach((btn) => btn.onclick = () => {
      document.querySelectorAll('[data-slot]').forEach((x) => x.classList.remove('selected'));
      btn.classList.add('selected');
      $('#eval-time').value = btn.dataset.slot;
    });
  } catch (error) {
    slotsBox.innerHTML = `<div class="notice">No pude consultar la agenda: ${escapeHtml(error.message)}</div>`;
  }
}

function applyOnboarding() {
  const prefs = getPreferences();
  const profile = getProfile();
  if ($('#onboard-name')) $('#onboard-name').value = profile.name || '';
  if ($('#onboard-branch')) $('#onboard-branch').value = profile.branch || 'huancayo';
  if ($('#onboard-interest') && prefs.interest) $('#onboard-interest').value = prefs.interest;
  if ($('#onboard-priority') && prefs.priority) $('#onboard-priority').value = prefs.priority;
}


function renderPlan() {
  const box = $('#home-plan');
  if (!box) return;
  const onboardingDone = store.get('dlorgia:onboardingComplete', false);
  const guideDone = Boolean(getPersonalGuide());
  const evaluation = store.get('dlorgia:lastEvaluation');
  const hasReminder = getReminders().some((x) => !x.done);
  const steps = [
    { label: 'Personalizar recorrido', done: onboardingDone, nav: 'portal' },
    { label: 'Crear perfil del Orientador', done: guideDone, nav: 'guide' },
    { label: 'Generar orientación', done: Boolean(currentOrientation), nav: 'calculator' },
    { label: 'Reservar evaluación', done: Boolean(evaluation), nav: 'evaluation' },
    { label: 'Organizar seguimiento', done: hasReminder, nav: 'followup' }
  ];
  const done = steps.filter((x) => x.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const next = steps.find((x) => !x.done);
  box.classList.remove('hidden');
  box.innerHTML = `<div class="plan-head"><span><small>MI PLAN</small><b>${done}/${steps.length} pasos completados</b></span><strong>${pct}%</strong></div>
    <div class="plan-progress"><span style="width:${pct}%"></span></div>
    <div class="plan-steps">${steps.map((x) => `<span class="${x.done ? 'done' : ''}">${x.done ? icon('check','ui-icon mini') : '<span class="plan-dot"></span>'} ${escapeHtml(x.label)}</span>`).join('')}</div>
    ${next ? `<button class="secondary full" id="plan-next">Siguiente: ${escapeHtml(next.label)} →</button>` : `<div class="plan-complete">${icon('circle-check','ui-icon mini')} Tu recorrido base está organizado. Puedes seguir usando el Orientador y el Asesor cuando lo necesites.</div>`}`;
  if (next && $('#plan-next')) $('#plan-next').onclick = () => show(next.nav);
}

function updateNetworkState() {
  const banner = $('#network-banner');
  if (!banner) return;
  banner.classList.toggle('hidden', navigator.onLine);
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const status = $('#install-status');
  if (status) status.textContent = 'Lista para instalar en este dispositivo.';
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const status = $('#install-status');
  if (status) status.textContent = 'D’Lorgia Orienta ya está instalada.';
});
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);

async function installPWA() {
  if (!deferredInstallPrompt) {
    const status = $('#install-status');
    if (status) status.textContent = 'Usa el menú del navegador → “Instalar app” o “Añadir a pantalla de inicio”.';
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice.catch(() => null);
  deferredInstallPrompt = null;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try { const reg = await navigator.serviceWorker.register('/service-worker.js?v=340', { updateViaCache: 'none' }); await reg.update(); }
  catch (error) { console.warn('Service worker no disponible', error); }
}

async function init() {
  restoreAuthSession();
  loadUserState();
  const [catResult, cfgResult] = await Promise.allSettled([api('/api/catalog'), api('/api/config')]);

  if (catResult.status === 'fulfilled') {
    catalog = catResult.value.items || [];
    const goals = catResult.value.goals || [];
    if ($('#treatment-select')) $('#treatment-select').innerHTML = catalog.map((x) => `<option value="${x.id}">${escapeHtml(x.category)} · ${escapeHtml(x.name)}</option>`).join('');
    if ($('#goal-select')) $('#goal-select').innerHTML = goals.map((x) => `<option value="${x.id}">${escapeHtml(x.label)}</option>`).join('');
  } else {
    console.error(catResult.reason);
    if ($('#catalog-list')) $('#catalog-list').innerHTML = '<div class="notice">No se pudo cargar el catálogo. Reintenta en unos segundos.</div>';
  }

  if (cfgResult.status === 'fulfilled') config = cfgResult.value;
  else console.error(cfgResult.reason);

  const status = $('#assistant-status');
  if (status) {
    status.classList.toggle('connected', Boolean(config.aiConfigured));
    status.classList.toggle('degraded', !config.aiConfigured);
    status.textContent = config.aiConfigured
      ? `● Asesor conectado · ${config.aiProvider || 'IA'}`
      : '● Modo seguro · respaldo local disponible';
  }

  if (selectedTreatment && $('#treatment-select')) $('#treatment-select').value = selectedTreatment;
  if (currentOrientation?.treatment?.name && $('#eval-interest')) $('#eval-interest').value = currentOrientation.treatment.name;

  const profile = getProfile();
  if (profile.name && $('#eval-name') && !$('#eval-name').value) $('#eval-name').value = profile.name;
  if (profile.branch && $('#eval-branch')) $('#eval-branch').value = profile.branch;

  renderCategoryFilters();
  renderHome();
  renderAdvisor();
  setReminderDefaults();
  applyOnboarding();
  checkDueReminders();
  updateNetworkState();
  registerServiceWorker();

  const rememberedUser = rawStore.get('dlorgia:loginUser', '');
  if ($('#login-user') && rememberedUser) $('#login-user').value = rememberedUser;

  if (!hasEntryAccess()) {
    navStack = ['login'];
    show('login', false);
  } else if (!store.get('dlorgia:onboardingComplete', false)) {
    navStack = ['onboarding'];
    show('onboarding', false);
  } else {
    navStack = ['home'];
    show('home', false);
  }
}

$$('[data-nav]').forEach((btn) => btn.addEventListener('click', () => show(btn.dataset.nav)));
$$('[data-back]').forEach((btn) => btn.addEventListener('click', goBack));

$$('[data-auth-mode]').forEach((btn) => btn.addEventListener('click', () => setAuthMode(btn.dataset.authMode)));

$('#forgot-access')?.addEventListener('click', () => {
  if ($('#reset-user')) $('#reset-user').value = $('#login-user')?.value.trim() || '';
  setAuthMode('reset');
});

$$('[data-toggle-password]').forEach((btn) => btn.addEventListener('click', () => {
  const input = $(btn.dataset.togglePassword);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}));

$('#register-password')?.addEventListener('input', (event) => {
  const score = passwordStrength(event.target.value);
  const meter = $('#password-meter');
  if (meter) meter.dataset.score = String(score);
});

$('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = $('#login-user').value.trim();
  const password = $('#login-password').value;
  if (!user || !password) return;
  const submit = event.currentTarget.querySelector('.auth-submit');
  setAuthFeedback('#login-feedback');
  if (submit) submit.classList.add('loading');
  try {
    const account = await verifyAccount(user, password);
    if (!account) throw new Error('Correo/usuario o clave incorrectos.');
    activeIdentity = publicIdentity(account);
    migrateLegacyData(account.id);
    writeSession(activeIdentity, $('#login-remember').checked);
    rawStore.set('dlorgia:loginUser', user);
    loadUserState();
    $('#login-password').value = '';
    await authSuccess(`Hola, ${account.name}`);
    toast('Sesión iniciada. Tu recorrido personal está listo.', 'success');
    enterExperience();
  } catch (error) {
    setAuthFeedback('#login-feedback', error.message || 'No se pudo iniciar sesión.');
    shakeAuthCard();
  } finally {
    if (submit) submit.classList.remove('loading');
  }
});

$('#register-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('#register-name').value.trim();
  const email = $('#register-email').value.trim();
  const username = $('#register-username').value.trim();
  const password = $('#register-password').value;
  const confirm = $('#register-confirm').value;
  const submit = event.currentTarget.querySelector('.auth-submit');
  setAuthFeedback('#register-feedback');
  if (password !== confirm) {
    setAuthFeedback('#register-feedback', 'Las claves no coinciden.'); shakeAuthCard(); return;
  }
  if (submit) submit.classList.add('loading');
  try {
    const account = await createAccount({ name, email, username, password });
    activeIdentity = publicIdentity(account);
    migrateLegacyData(account.id);
    writeSession(activeIdentity, true);
    rawStore.set('dlorgia:loginUser', account.email);
    loadUserState();
    if (!getProfile().name) store.set('dlorgia:profile', { ...getProfile(), name: account.name, branch: 'huancayo' });
    await authSuccess('Tu espacio está creado');
    toast('Cuenta creada. Ahora personalizamos tu recorrido.', 'success');
    enterExperience();
  } catch (error) {
    setAuthFeedback('#register-feedback', error.message || 'No se pudo crear la cuenta.');
    shakeAuthCard();
  } finally {
    if (submit) submit.classList.remove('loading');
  }
});

$('#reset-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const identifier = $('#reset-user').value.trim();
  const password = $('#reset-password').value;
  const confirm = $('#reset-confirm').value;
  const submit = event.currentTarget.querySelector('.auth-submit');
  setAuthFeedback('#reset-feedback');
  if (password !== confirm) { setAuthFeedback('#reset-feedback', 'Las claves no coinciden.'); shakeAuthCard(); return; }
  if (passwordStrength(password) < 2) { setAuthFeedback('#reset-feedback', 'La nueva clave necesita 8+ caracteres y una combinación más fuerte.'); shakeAuthCard(); return; }
  const account = findAccount(identifier);
  if (!account) { setAuthFeedback('#reset-feedback', 'No encontré esa cuenta guardada en este dispositivo.'); shakeAuthCard(); return; }
  if (submit) submit.classList.add('loading');
  try {
    const salt = randomSalt();
    const passwordHash = await derivePassword(password, salt);
    const accounts = getAccounts().map((item) => item.id === account.id ? { ...item, salt, passwordHash, passwordUpdatedAt: new Date().toISOString() } : item);
    setAccounts(accounts);
    setAuthFeedback('#reset-feedback', 'Clave actualizada. Ya puedes ingresar.', true);
    rawStore.set('dlorgia:loginUser', account.email);
    $('#login-user').value = account.email;
    $('#login-password').value = '';
    setTimeout(() => setAuthMode('login'), 700);
  } catch {
    setAuthFeedback('#reset-feedback', 'No pude actualizar la clave en este navegador.');
  } finally {
    if (submit) submit.classList.remove('loading');
  }
});

$('#guest-entry')?.addEventListener('click', async () => {
  loginGuest();
  await authSuccess('Modo invitado');
  enterExperience();
});

$('#logout-app')?.addEventListener('click', () => {
  clearAuthSession();
  setAuthMode('login');
  navStack = ['login'];
  show('login', false);
  toast('Sesión cerrada. Tus datos locales siguen guardados.', 'success');
});

// Microinteracción breve: confirma el toque sin alterar la navegación.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || !button.querySelector('.ui-icon')) return;
  button.classList.remove('icon-pop');
  void button.offsetWidth;
  button.classList.add('icon-pop');
});

$('#orientation-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await api('/api/orientation', {
      method: 'POST',
      body: JSON.stringify({
        treatmentId: $('#treatment-select').value,
        goal: $('#goal-select').value,
        sensitivity: $('#sensitivity-select').value,
        availability: $('#availability-select').value
      })
    });
    renderOrientation(result);
  } catch (error) { alert(error.message); }
});

$('#chat-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendQuestion(text);
});

$$('[data-prompt]').forEach((btn) => btn.addEventListener('click', () => {
  advisorFocus = btn.dataset.focus || 'orientacion';
  sendQuestion(btn.dataset.prompt);
}));

$('#evaluation-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const payload = {
      name: $('#eval-name').value,
      contact: $('#eval-contact').value,
      branch: $('#eval-branch').value,
      interest: $('#eval-interest').value || currentOrientation?.treatment?.name || 'Orientación general',
      date: $('#eval-date').value,
      time: $('#eval-time').value
    };
    if (!payload.date || !payload.time) return alert('Selecciona una fecha y un horario disponible.');

    const booking = await api('/api/reservations', { method: 'POST', body: JSON.stringify(payload) });
    const data = await api('/api/evaluation', { method: 'POST', body: JSON.stringify(payload) });
    const savedEvaluation = { ...payload, branch: data.branch, reservationId: booking.reservation.id, createdAt: new Date().toISOString() };
    store.set('dlorgia:lastEvaluation', savedEvaluation);

    const reminders = getReminders();
    reminders.push({
      id: `appointment-${booking.reservation.id}`,
      title: `Evaluación D’Lorgia · ${payload.interest}`,
      date: payload.date, time: payload.time, type: 'evaluacion', done: false, notified: false,
      createdAt: new Date().toISOString()
    });
    setReminders(reminders.sort((a,b) => reminderTimestamp(a)-reminderTimestamp(b)));

    const box = $('#evaluation-result');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="success booking-success"><span class="booking-check">✓</span><b>Horario reservado</b><p><strong>${escapeHtml(booking.reservation.branchName)} · ${escapeHtml(payload.date)} · ${escapeHtml(payload.time)}</strong></p><p>Código: ${escapeHtml(booking.reservation.id)}. ${escapeHtml(data.message)}</p><a class="primary full" style="display:block;text-align:center;text-decoration:none" target="_blank" rel="noopener" href="${data.whatsappUrl}">Continuar con el equipo por WhatsApp</a></div>`;
    renderFollowUp();
    renderHome();
  } catch (error) {
    alert(error.message);
    await loadSchedule();
  }
});

$('#onboarding-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#onboard-name').value.trim();
  const branch = $('#onboard-branch').value;
  const interest = $('#onboard-interest').value;
  const priority = $('#onboard-priority').value;
  store.set('dlorgia:profile', { ...getProfile(), name, branch });
  savePreferences({ interest, priority, updatedAt: new Date().toISOString() });
  store.set('dlorgia:onboardingComplete', true);
  if ($('#eval-name')) $('#eval-name').value = name;
  if ($('#eval-branch')) $('#eval-branch').value = branch;
  renderAdvisor();
  renderHome();
  show('home');
});

$('#skip-onboarding')?.addEventListener('click', () => {
  store.set('dlorgia:onboardingComplete', true);
  show('home');
});

$('#eval-branch')?.addEventListener('change', loadSchedule);
$('#eval-date')?.addEventListener('change', loadSchedule);

$('#profile-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  store.set('dlorgia:profile', { name: $('#profile-name').value.trim(), branch: $('#profile-branch').value });
  toast('Perfil guardado en tu espacio.', 'success');
  renderPortal();
  renderAdvisor();
});

$('#add-reminder')?.addEventListener('click', saveReminder);
$('#enable-notifications')?.addEventListener('click', enableNotifications);
$('#download-summary')?.addEventListener('click', downloadSummary);
$('#portal-download')?.addEventListener('click', downloadSummary);
$('#install-app')?.addEventListener('click', installPWA);

setInterval(checkDueReminders, 30_000);

init().catch((error) => {
  console.error(error);
  alert('La aplicación cargó parcialmente. Revisa la conexión y vuelve a intentar.');
});
