import { $, $$, showToast } from './core/utils.js';
import { store } from './core/store.js';
import { appState } from './core/app-state.js';
import { exportClientsCSV, exportClientsXLSX, exportFullBackupJSON } from './services/exporter.js';
import { renderDashboard } from './ui/dashboard-view.js';
import { ClientsView } from './ui/clients-view.js';
import { ProjectsView } from './ui/projects-view.js';
import { ImportView } from './ui/import-view.js';
import { ModalsView } from './ui/modals-view.js';
import { initFieldTools } from './ui/field-tools.js';
import { buildPortalData } from './data/team.js';

const PAGE_TITLES = { dashboard: 'Resumen', clients: 'Clientes', projects: 'Proyectos', import: 'Importar', settings: 'Ajustes' };
function goto(page) {
  $$('.page').forEach((el) => el.classList.toggle('active', el.id === `page-${page}`));
  $$('.nav button[data-page]').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === page));
  const c = $('#crumb'); if (c) c.textContent = PAGE_TITLES[page] || 'Resumen';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderSidebarCounters() {
  const n = store.clients.length; const pCount = store.clients.reduce((a, c) => a + (c.projects?.length || 0), 0);
  $('#sideCount').textContent = n; if ($('#sideProjCount')) $('#sideProjCount').textContent = pCount;
  $('#storageText').textContent = `${n} clientes · ${pCount} proy.`; $('#storageBar').style.width = `${Math.min(100, Math.max(8, n * 1.5))}%`;
  const u = $('#undoBtn'); if (u) u.style.display = store.lastSnapshot ? 'inline-flex' : 'none';
}
function handleUrlLeads() {
  const params = new URLSearchParams(location.search);
  const ln = params.get('leadName') || params.get('leadname');
  if (ln) { store.upsertOne({ name: ln, phone: params.get('leadPhone') || '', type: params.get('leadType') || '', province: 'Lead web', status: 'Pendiente' }); showToast('Lead captado', ln); history.replaceState(null, '', location.pathname); }
  if (location.hash.startsWith('#portal=')) {
    const token = location.hash.split('=')[1]; const cli = store.clients.find((c) => (c.portalToken || buildPortalData(c).clientName) && token);
    // simple portal display
    const c = store.clients.find((x) => x.portalToken === token || btoa(`${x.id}:${x.name}`).replace(/=/g, '').slice(0, 16) === token);
    if (c) { alert(`Portal de ${c.name}: ${c.projects.length} proyectos, ${c.projects.map((p) => p.title + ' ' + (p.productionStage || p.stage)).join(' | ')}`); }
  }
}
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10); const g = appState.goals;
  if (g.lastActive !== today) { const diff = g.lastActive ? Math.floor((new Date(today) - new Date(g.lastActive)) / 86400000) : 99; g.streak = diff === 1 ? g.streak + 1 : 1; g.lastActive = today; appState.setGoals(g); }
}
function renderSettingsExtras() {
  import('./ui/finance-panel.js').then((m) => { const b = $('#ratesBox'); if (b) { b.innerHTML = m.renderRatesConfig(appState); b.querySelectorAll('[data-rate]').forEach((inp) => inp.onchange = () => { const r = {}; r[inp.dataset.rate] = Number(inp.value); appState.setRates(r); showToast('Tasa actualizada'); }); b.querySelector('[data-rate-base]')?.addEventListener('change', (e) => appState.setRates({ base: e.target.value })); } });
  import('./ui/team-panel.js').then((m) => {
    const tb = $('#teamBox'); if (tb) tb.innerHTML = m.teamHTML(appState, store);
    const sy = $('#syncBox'); if (sy) sy.innerHTML = m.syncHTML(appState, store);
    const lf = $('#leadFormBox'); if (lf) lf.innerHTML = m.leadFormHTML();
    m.bindTeam(appState, store);
    const db = $('#demosBox'); if (db) db.innerHTML = `<div class="extra-box"><b>M18 · Demos por rubro</b><div style="display:grid;gap:6px;margin-top:6px">${Object.entries(appState.demos).map(([k, v]) => `<div style="display:flex;gap:6px"><span style="flex:1;font-size:12px">${k}</span><input data-demo-key="${k}" value="${v}" style="flex:2;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px"></div>`).join('')}</div><button class="btn btn-aqua" id="saveDemos" style="margin-top:6px;padding:6px 10px;font-size:12px">Guardar demos</button></div>`;
    document.getElementById('saveDemos')?.addEventListener('click', () => { const o = {}; document.querySelectorAll('[data-demo-key]').forEach((i) => o[i.dataset.demoKey] = i.value.trim()); appState.setDemos(o); showToast('Demos guardadas'); });
    const pf = $('#profileBox'); if (pf) pf.innerHTML = `<div class="extra-box"><b>M24 · Perfil y QR portafolio</b><div style="display:grid;gap:6px;margin-top:6px"><input id="pfName" value="${appState.profile.businessName}" placeholder="Nombre negocio" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"><input id="pfUrl" value="${appState.profile.portfolioUrl}" placeholder="https://portfolio" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"><input id="pfPhone" value="${appState.profile.phone}" placeholder="Tel" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"></div><button class="btn btn-aqua" id="saveProfile" style="margin-top:6px;padding:6px 10px;font-size:12px">Guardar perfil</button></div>`;
    document.getElementById('saveProfile')?.addEventListener('click', () => { appState.setProfile({ businessName: document.getElementById('pfName').value, portfolioUrl: document.getElementById('pfUrl').value, phone: document.getElementById('pfPhone').value }); showToast('Perfil guardado'); });
  });
  import('./ui/goals-panel.js').then((m) => {
    const gc = $('#goalsConfigBox'); if (gc) gc.innerHTML = `<div id="goalsBar2"></div>`; // placeholder
    const th = $('#themeBox'); if (th) th.innerHTML = m.themeHTML(appState);
    const sn = $('#snapsBox'); if (sn) sn.innerHTML = m.snapshotsHTML(appState);
    const ex = $('#extractorBox'); if (ex) ex.innerHTML = m.extractorHTML();
    m.bindGoals(appState, store);
  });
}
function init() {
  const d = new Date(); const dt = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); if ($('#today')) $('#today').textContent = dt.charAt(0).toUpperCase() + dt.slice(1);
  handleUrlLeads(); updateStreak();
  const modals = new ModalsView(store);
  const shared = { goto, openForm: (c = null) => modals.openForm(c), openFormWithService: (svc) => modals.openForm(null, svc), openServiceForm: (svc = null) => modals.openServiceForm(svc), openDetail: (id) => modals.openDetail(id), filterByProvince: (prov) => { goto('clients'); clientsView.setProvinceFilter(prov); } };
  const clientsView = new ClientsView(store, shared); const projectsView = new ProjectsView(store, shared); new ImportView(store, shared);
  const refreshAll = () => { renderSidebarCounters(); renderDashboard(store, shared, appState); clientsView.render(appState); projectsView.render(appState); renderSettingsExtras(); };
  store.subscribe(refreshAll); appState.subscribe(refreshAll); refreshAll(); initFieldTools(store, shared);
  // M30 · auto-sync si está activado + default endpoint
  if (!appState.sync.endpoint) appState.setSync({ endpoint: 'https://brujula-crm-sync.brujulacrm6207.workers.dev/sync' });
  import('./services/sync.js').then((m) => m.enableAutoSync(store, 5));
  // M-automation · recordatorios WA automáticos cada 60 min + 9am
  import('./services/automation.js').then((m) => { try { m.scheduleAutomation(store, appState, 60); const hits = m.runAutomationCheck(store, appState, true); if (hits.length) console.log('[Brújula] automatizaciones detectadas:', hits.length); } catch(e){ console.warn('auto', e); } });
  $$('.nav button[data-page]').forEach((btn) => btn.addEventListener('click', () => goto(btn.dataset.page)));
  $('#headerImportBtn')?.addEventListener('click', () => goto('import')); $('#newClientBtn')?.addEventListener('click', () => modals.openForm()); $('#newClientBtn2')?.addEventListener('click', () => modals.openForm());
  $('#viewClientsBtn')?.addEventListener('click', () => goto('clients'));
  $('#burstBtn')?.addEventListener('click', () => { import('./ui/cadence-panel.js').then((m) => { let wrap = document.getElementById('burstMount'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'burstMount'; document.body.appendChild(wrap); } wrap.innerHTML = m.renderBurstUI(store, shared); wrap.querySelector('#burstMask')?.classList.add('open'); m.initBurst(store, shared); }); });
  $('#undoBtn')?.addEventListener('click', () => { if (store.undoLast()) showToast('Deshecho', 'Restaurado.'); });
  const ensure = () => { if (!store.clients.length) { showToast('Base vacía', 'Importa primero.', true); return false; } return true; };
  $('#exportXlsxBtn')?.addEventListener('click', () => { if (ensure()) { exportClientsXLSX(store.clients); showToast('Excel generado'); } });
  $('#exportCsvBtn')?.addEventListener('click', () => { if (ensure()) { exportClientsCSV(store.clients); showToast('CSV generado'); } });
  $('#exportXlsxSettingsBtn')?.addEventListener('click', () => { if (ensure()) exportClientsXLSX(store.clients); });
  $('#exportJsonSettingsBtn')?.addEventListener('click', () => { exportFullBackupJSON(store); showToast('JSON listo'); });
  $('#clearAllBtn')?.addEventListener('click', () => { if (!store.clients.length) return; if (confirm('¿Vaciar todos los clientes? Puedes deshacer.')) { appState.pushSnap(store.clients); store.clearAll(); showToast('Base vaciada'); } });
  window.addEventListener('open-client', (e) => modals.openDetail(e.detail));
  if ('Notification' in window && appState.notif.enabled === false) {
    // auto ask once if has upcoming
    const hasDue = store.clients.some((c) => c.nextDate); if (hasDue) setTimeout(() => { if (confirm('¿Activar recordatorios diarios del navegador (M26)?')) { import('./core/ops.js').then((m) => m.requestNotificationPermission(appState)); } }, 2500);
  }
}
init();
