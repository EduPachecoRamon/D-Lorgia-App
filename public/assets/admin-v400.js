const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const SESSION_KEY = 'dlorgia:remote:session:v1';
let session = null;
let profile = null;

function storedSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
function saveSession(value, persistent = true){
  session = value;
  localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
  (persistent ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(value));
}
function clearSession(){ session=null; profile=null; localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); }
function toast(message){ const el=$('#admin-toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2500); }
function esc(v=''){ return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function request(path, options={}){
  const token = session?.access_token || storedSession()?.access_token;
  const res = await fetch(path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers||{})}});
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function showLogin(message=''){
  $('#admin-login-panel').classList.remove('hidden'); $('#admin-dashboard').classList.add('hidden'); $('#admin-session').classList.add('hidden');
  $('#admin-login-feedback').textContent=message;
}
function showDashboard(){
  $('#admin-login-panel').classList.add('hidden'); $('#admin-dashboard').classList.remove('hidden'); $('#admin-session').classList.remove('hidden');
  $('#admin-user').textContent = `${profile?.name || profile?.email || 'Admin'} · administrador`;
}

async function authenticateExisting(){
  session = storedSession(); if(!session?.access_token) return false;
  try{ const me=await request('/api/auth/me'); profile=me.profile; if(profile?.role!=='admin') throw new Error('Esta cuenta no tiene rol de administrador.'); return true; }
  catch(error){ clearSession(); showLogin(error.message); return false; }
}

function renderStats(data){
  const values=[data.users,data.guides,data.appointments,data.pendingAppointments];
  $$('#admin-stats strong').forEach((el,i)=>el.textContent=values[i] ?? 0);
}
function renderUsers(items=[]){
  $('#users-table').innerHTML = items.length ? `<table><thead><tr><th>USUARIO</th><th>ROL</th><th>SEDE</th><th>REGISTRO</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.name)}</b><small>${esc(x.email)} · @${esc(x.username)}</small></td><td><span class="status ${x.role==='admin'?'confirmed':'completed'}">${esc(x.role)}</span></td><td>${esc(x.branch||'—')}</td><td>${x.created_at?new Date(x.created_at).toLocaleString('es-PE'):'—'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Todavía no hay usuarios.</div>';
}
function renderAppointments(items=[]){
  $('#appointments-table').innerHTML = items.length ? `<table><thead><tr><th>INTERÉS</th><th>FECHA</th><th>SEDE</th><th>ESTADO</th><th>ACCIÓN</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.patient?.name || x.interest)}</b><small>${esc(x.patient?.email || x.contact || '')}</small><small>${esc(x.interest)}</small></td><td>${esc(x.date||'—')}<small>${esc(x.time||'')}</small></td><td>${esc(x.branch)}</td><td><span class="status ${esc(x.status)}">${esc(x.status)}</span></td><td><div class="row-actions"><select data-appt-select="${esc(x.id)}"><option value="pending" ${x.status==='pending'?'selected':''}>Pendiente</option><option value="confirmed" ${x.status==='confirmed'?'selected':''}>Confirmada</option><option value="completed" ${x.status==='completed'?'selected':''}>Completada</option><option value="cancelled" ${x.status==='cancelled'?'selected':''}>Cancelada</option></select><button data-save-appt="${esc(x.id)}">Guardar</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No hay solicitudes de evaluación.</div>';
  $$('[data-save-appt]').forEach(btn=>btn.onclick=async()=>{ const id=btn.dataset.saveAppt; const status=$(`[data-appt-select="${CSS.escape(id)}"]`).value; btn.disabled=true; try{ await request(`/api/admin/appointments/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status})}); toast('Estado actualizado'); await loadAppointments(); }catch(e){toast(e.message)}finally{btn.disabled=false} });
}
function renderTreatments(items=[]){
  $('#treatments-table').innerHTML = items.length ? `<table><thead><tr><th>TRATAMIENTO</th><th>CATEGORÍA</th><th>ESTADO</th><th>ACTUALIZACIÓN</th></tr></thead><tbody>${items.map(x=>`<tr><td><b>${esc(x.name)}</b><small>${esc(x.id)} · ${esc(x.short||'')}</small></td><td>${esc(x.category)}</td><td><button class="toggle-btn ${x.active?'on':'off'}" data-toggle-treatment="${esc(x.id)}" data-active="${x.active?'1':'0'}">${x.active?'Activo':'Inactivo'}</button></td><td>${x.updated_at?new Date(x.updated_at).toLocaleString('es-PE'):'—'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">La base de tratamientos está vacía. Usa “Cargar catálogo base”.</div>';
  $$('[data-toggle-treatment]').forEach(btn=>btn.onclick=async()=>{ const active=btn.dataset.active!=='1'; try{ await request(`/api/admin/treatments/${encodeURIComponent(btn.dataset.toggleTreatment)}`,{method:'PATCH',body:JSON.stringify({active})}); toast(active?'Tratamiento activado':'Tratamiento ocultado'); await loadTreatments(); }catch(e){toast(e.message)} });
}
async function loadOverview(){ renderStats(await request('/api/admin/overview')); $('#db-state').textContent='PostgreSQL conectado · los cambios se guardan en Supabase'; }
async function loadUsers(){ renderUsers((await request('/api/admin/users')).items); }
async function loadAppointments(){ renderAppointments((await request('/api/admin/appointments')).items); }
async function loadTreatments(){ renderTreatments((await request('/api/admin/treatments')).items); }
async function loadAll(){ try{ await Promise.all([loadOverview(),loadUsers(),loadAppointments(),loadTreatments()]); }catch(e){ $('#db-state').textContent=`Error: ${e.message}`; toast(e.message); } }

$('#admin-login-form').addEventListener('submit',async e=>{ e.preventDefault(); const feedback=$('#admin-login-feedback'); feedback.textContent=''; try{ const data=await request('/api/auth/login',{method:'POST',body:JSON.stringify({identifier:$('#admin-login-user').value.trim(),password:$('#admin-login-password').value})}); if(data.profile?.role!=='admin') throw new Error('La cuenta existe, pero no tiene rol de administrador.'); saveSession(data.session,true); profile=data.profile; $('#admin-login-password').value=''; showDashboard(); await loadAll(); }catch(err){feedback.textContent=err.message} });
$('#admin-logout').onclick=()=>{clearSession();showLogin('Sesión administrativa cerrada.')};
$('#refresh-admin').onclick=loadAll;
$('#seed-treatments').onclick=async()=>{ try{ const data=await request('/api/admin/treatments/seed',{method:'POST',body:'{}'}); toast(`Catálogo base cargado: ${data.seeded}`); await loadTreatments(); await loadOverview(); }catch(e){toast(e.message)} };
$('#treatment-form').addEventListener('submit',async e=>{e.preventDefault();try{await request('/api/admin/treatments',{method:'POST',body:JSON.stringify({id:$('#t-id').value.trim(),name:$('#t-name').value.trim(),category:$('#t-category').value.trim(),short:$('#t-short').value.trim(),objective:$('#t-objective').value.trim(),goals:$('#t-goals').value.split(',').map(x=>x.trim()).filter(Boolean),recovery:$('#t-recovery').value.trim(),intensity:$('#t-intensity').value})});e.currentTarget.reset();toast('Tratamiento guardado');await loadTreatments();await loadOverview()}catch(err){toast(err.message)}});
$$('[data-admin-tab]').forEach(btn=>btn.onclick=()=>{ $$('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x===btn)); $$('[data-admin-panel]').forEach(x=>x.classList.toggle('active',x.dataset.adminPanel===btn.dataset.adminTab)); });

(async()=>{ const status=await fetch('/api/auth/status').then(r=>r.json()).catch(()=>({configured:false})); if(!status.configured){showLogin('Supabase todavía no está configurado en Render.');return;} if(await authenticateExisting()){showDashboard();await loadAll()}else showLogin(); })();
