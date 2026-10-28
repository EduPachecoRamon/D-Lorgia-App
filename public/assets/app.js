const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const store = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let catalog = [];
let config = {};
let currentOrientation = store.get('dlorgia:lastOrientation');
let selectedTreatment = currentOrientation?.treatment?.id || null;
let advisorFocus = 'orientacion';
let navStack = ['home'];
let activeCategory = 'Todas';

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


function icon(name, className = 'ui-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

const ambientScenes = {
  login: ['sparkles','heart','lock','leaf','user','mail'],
  onboarding: ['sparkles','heart','user','calendar','leaf','target'],
  home: ['sparkles','heart-pulse','calendar','message','leaf','user'],
  catalog: ['scan','sparkles','target','heart','leaf','bookmark'],
  detail: ['sparkles','scan','target','heart','stethoscope','bookmark'],
  calculator: ['target','sparkles','clock','heart','check','scan'],
  assistant: ['sparkles','message','heart','user','stethoscope','leaf'],
  summary: ['file','check','bookmark','sparkles','heart','calendar'],
  evaluation: ['stethoscope','calendar','check','clock','heart','user'],
  followup: ['bell','clock','calendar','check','heart-pulse','bookmark'],
  portal: ['user','bookmark','file','bell','calendar','heart']
};

function setAmbientScene(scene) {
  const layer = $('#ambient-layer');
  if (!layer) return;
  layer.dataset.scene = scene;
  const names = ambientScenes[scene] || ambientScenes.home;
  $$('.ambient-icon use').forEach((use, index) => use.setAttribute('href', `#i-${names[index % names.length]}`));
}

function hasEntryAccess() {
  return store.get('dlorgia:entryComplete', false) || sessionStorage.getItem('dlorgia:sessionEntry') === '1';
}

function enterExperience() {
  const next = store.get('dlorgia:onboardingComplete', false) ? 'home' : 'onboarding';
  navStack = [next];
  show(next, false);
}

function setNavActive(id) {
  $$('.bottom-nav [data-nav]').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === id));
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
  if (id === 'summary') renderSummary();
  if (id === 'followup') renderFollowUp();
  if (id === 'portal') renderPortal();
  if (id === 'catalog') renderCatalog();
  if (id === 'assistant') renderAdvisor();
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
    else if (store.get('dlorgia:onboardingComplete', false)) statePill.textContent = 'Tu recorrido ya está personalizado';
    else statePill.textContent = 'Orientación + acompañamiento';
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
  $('#catalog-list').innerHTML = items.length ? items.map((x) => `
    <button class="treatment-card" data-treatment="${escapeHtml(x.id)}">
      <span class="avatar">${categoryIcon(x.category)}</span>
      <span><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.short)}</small></span>
      <span class="card-arrow">${icon('chevron-right')}</span>
    </button>`).join('') : '<div class="empty">No hay tratamientos en esta categoría.</div>';
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
  $('#detail-name').textContent = treatment.name;
  $('#detail-content').innerHTML = `
    <div class="detail-hero">
      <p class="eyebrow">${escapeHtml(treatment.category)}</p>
      <h3>${escapeHtml(treatment.name)}</h3>
      <p>${escapeHtml(treatment.description)}</p>
    </div>
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
  const treatment = catalog.find((x) => x.id === selectedTreatment) || currentOrientation?.treatment || null;
  const greeting = $('#advisor-greeting');
  if (greeting) greeting.textContent = profile.name
    ? `${profile.name}, te ayudo a entender tu proceso y organizar tu siguiente paso.`
    : 'Te ayudo a entender tu proceso y organizar tu siguiente paso.';

  const context = $('#advisor-context');
  if (!context) return;
  if (treatment) {
    const prefs = getPreferences();
    const recent = getAdvisorMemory().filter((x) => x.role === 'user').slice(-2);
    context.innerHTML = `<div class="context-row"><span><small>Contexto actual</small><b>${escapeHtml(treatment.name)}</b></span><button class="secondary" id="change-context" type="button">Cambiar</button></div>
      <div class="memory-chips">
        ${prefs.interest ? `<span>Interés: ${escapeHtml(prefs.interest)}</span>` : ''}
        ${prefs.priority ? `<span>Prioridad: ${escapeHtml(prefs.priority)}</span>` : ''}
        ${recent.map((x) => `<span title="Lo dijiste al asesor">“${escapeHtml(x.text.slice(0,52))}${x.text.length>52?'…':''}”</span>`).join('')}
      </div>`;
    $('#change-context').onclick = () => show('catalog');
  } else {
    context.innerHTML = `<div class="context-row"><span><small>Contexto actual</small><b>Sin tratamiento seleccionado</b></span><button class="secondary" id="choose-context" type="button">Elegir</button></div>`;
    $('#choose-context').onclick = () => show('catalog');
  }
}

function addBubble(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = `bubble ${who}`;
  el.textContent = text;
  $('#chat-log').appendChild(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function advisorContextText() {
  const profile = getProfile();
  const treatment = catalog.find((x) => x.id === selectedTreatment);
  const pieces = [
    `Etapa: asesor personalizado`,
    `Enfoque: ${advisorFocus}`,
    treatment ? `Tratamiento seleccionado: ${treatment.name}` : '',
    currentOrientation?.goalNote ? `Objetivo del usuario: ${currentOrientation.goalNote}` : '',
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
  addBubble('Estoy revisando tu contexto…', 'bot');
  const pending = $('#chat-log').lastElementChild;
  const submit = $('#chat-form button[type="submit"]');
  const meta = $('#last-answer-meta');
  if (meta) meta.classList.add('hidden');
  if (submit) { submit.disabled = true; submit.textContent = 'Consultando…'; }

  try {
    const data = await api('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ message: text, context: advisorContextText() })
    });
    pending.textContent = data.answer || 'No pude generar una respuesta. Puedes continuar con una evaluación profesional.';
    rememberAdvisor('assistant', pending.textContent);
    if (meta) {
      const label = data.source === 'gemini' ? 'Respuesta asistida por Gemini + reglas D’Lorgia' : 'Respuesta de respaldo local validada para el prototipo';
      meta.textContent = label;
      meta.classList.remove('hidden');
    }
  } catch (error) {
    pending.textContent = 'No pude conectar con el servicio en este momento. La orientación general sigue disponible y puedes continuar con una evaluación profesional.';
    if (meta) {
      meta.textContent = 'Conexión no disponible · modo seguro';
      meta.classList.remove('hidden');
    }
    console.error(error);
  } finally {
    if (submit) { submit.disabled = false; submit.textContent = 'Enviar'; }
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
  const evalData = store.get('dlorgia:lastEvaluation');
  const treatment = currentOrientation?.treatment?.name || 'Orientación pendiente';
  const follow = $('#followup-content');
  if (follow) {
    follow.innerHTML = `
      <div class="panel"><p class="eyebrow">PROCESO ACTUAL</p><h3>${escapeHtml(treatment)}</h3><div class="timeline">
        <div class="timeline-item ${currentOrientation ? 'done' : ''}"><span class="dot">${currentOrientation ? '✓' : '1'}</span><div><b>Orientación inicial</b><p>${currentOrientation ? 'Resumen generado y guardado en este dispositivo.' : 'Selecciona un tratamiento y genera tu orientación.'}</p></div></div>
        <div class="timeline-item ${evalData ? 'done' : ''}"><span class="dot">${evalData ? '✓' : '2'}</span><div><b>Evaluación profesional</b><p>${evalData ? `Solicitud preparada para ${escapeHtml(evalData.branch)}${evalData.date ? ` · ${escapeHtml(evalData.date)}` : ''}.` : 'Pendiente. El equipo profesional confirma la decisión clínica.'}</p></div></div>
        <div class="timeline-item"><span class="dot">3</span><div><b>Cuidados y seguimiento</b><p>Guarda recordatorios para revisar indicaciones y próximos pasos.</p></div></div>
        <div class="timeline-item"><span class="dot">4</span><div><b>Continuidad</b><p>Registra dudas y vuelve al asesor cuando necesites comprender mejor el proceso.</p></div></div>
      </div></div>`;
  }
  renderReminderList($('#reminders-list'));
}

function renderPortal() {
  const profile = getProfile();
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
  const evaluation = store.get('dlorgia:lastEvaluation');
  const hasReminder = getReminders().some((x) => !x.done);
  const steps = [
    { label: 'Personalizar recorrido', done: onboardingDone, nav: 'portal' },
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
    ${next ? `<button class="secondary full" id="plan-next">Siguiente: ${escapeHtml(next.label)} →</button>` : `<div class="plan-complete">${icon('circle-check','ui-icon mini')} Tu recorrido base está organizado. Puedes seguir usando el asesor cuando lo necesites.</div>`}`;
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
  try { await navigator.serviceWorker.register('/service-worker.js'); }
  catch (error) { console.warn('Service worker no disponible', error); }
}

async function init() {
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

  const rememberedUser = store.get('dlorgia:loginUser', '');
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

$('#login-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const user = $('#login-user').value.trim();
  const password = $('#login-password').value;
  if (!user || !password) return;
  if ($('#login-remember').checked) {
    store.set('dlorgia:entryComplete', true);
    store.set('dlorgia:loginUser', user);
  } else {
    sessionStorage.setItem('dlorgia:sessionEntry', '1');
  }
  $('#login-password').value = '';
  enterExperience();
});

$('#guest-entry')?.addEventListener('click', () => {
  sessionStorage.setItem('dlorgia:sessionEntry', '1');
  enterExperience();
});

$('#toggle-password')?.addEventListener('click', () => {
  const input = $('#login-password');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
});

$('#logout-app')?.addEventListener('click', () => {
  localStorage.removeItem('dlorgia:entryComplete');
  sessionStorage.removeItem('dlorgia:sessionEntry');
  navStack = ['login'];
  show('login', false);
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
  alert('Perfil del prototipo guardado en este navegador.');
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
