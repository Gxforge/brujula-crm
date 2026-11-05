import { esc, showToast } from '../core/utils.js';
import { buildPortalToken, buildPortalData } from '../data/team.js';

export function teamHTML(appState) {
  const team = appState.team || [];
  return `<div class="extra-box"><h3>Equipo</h3>
  <div class="team-list">${team.length ? team.map((m) => `<div class="team-row"><span><b>${esc(m.name)}</b><small>${Number(m.commissionPct || 0)}%${m.commissionFixed ? ` + ${m.commissionFixed}` : ''} por venta</small></span><button class="chip-btn" data-team-del="${esc(m.id)}" aria-label="Quitar ${esc(m.name)}">Quitar</button></div>`).join('') : '<p class="muted-note">Aún no has añadido a nadie.</p>'}</div>
  <div class="team-add"><input id="teamName" placeholder="Nombre"><input id="teamPct" type="number" min="0" placeholder="%"><input id="teamFixed" type="number" min="0" placeholder="Fijo"><button class="btn btn-aqua" id="teamAdd">Añadir</button></div></div>`;
}

export function portalHTML(client) {
  const token = client.portalToken || buildPortalToken(client);
  const data = buildPortalData(client);
  return `<div class="extra-box"><b>Portal del cliente</b>
  <p class="muted-note">Comparte un enlace de solo lectura para mostrar el avance.</p>
  <div class="portal-link"><input value="${location.origin}${location.pathname}#portal=${token}" readonly><button class="chip-btn" data-portal-copy="${esc(token)}">Copiar enlace</button></div>
  <div class="portal-progress">Progreso: <b>${data.pct}%</b> · Pendientes: ${data.pendingInputs.slice(0, 3).join(', ') || 'nada'}</div></div>`;
}

export function syncHTML(appState, store) {
  const s = appState.sync || {}; const signedIn = Boolean(s.token);
  const account = signedIn
    ? `<div class="sync-account"><b>Cuenta conectada</b><span>${esc(s.accountEmail || '')}</span><button class="chip-btn" id="syncSignOut">Cerrar sesión</button></div>`
    : `<div class="sync-login"><input id="syncEmail" type="email" autocomplete="email" placeholder="Correo electrónico"><input id="syncPassword" type="password" autocomplete="current-password" placeholder="Contraseña (mínimo 10 caracteres)"><div class="sync-actions"><button class="btn btn-primary" id="syncAuth" data-create="${s.createAccount ? 'true' : 'false'}">${s.createAccount ? 'Crear cuenta' : 'Iniciar sesión'}</button><button class="chip-btn" id="syncMode">${s.createAccount ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button></div><small class="muted-note">Usa el mismo correo en Android y PC.</small></div>`;
  return `<div class="extra-box sync-card"><div class="sync-heading"><div><h3>Sincronización</h3><p class="muted-note">Mantén tus datos al día en tus dispositivos.</p></div><span class="sync-indicator ${s.lastSync ? 'is-online' : ''}" id="syncStatus">${s.lastSync ? 'Al día' : signedIn ? 'Cuenta lista' : 'Solo en este dispositivo'}</span></div>
  ${account}${signedIn ? `<label class="sync-toggle"><input type="checkbox" id="syncEnabled" ${s.enabled ? 'checked' : ''}> Sincronizar automáticamente</label><button class="btn btn-primary" id="syncNow">Sincronizar ahora</button>` : ''}
  <small class="muted-note">${store?.clients?.length || 0} clientes en este dispositivo</small></div>`;
}

export function bindTeam(appState, store) {
  document.getElementById('teamAdd')?.addEventListener('click', () => {
    const name = document.getElementById('teamName').value.trim();
    if (!name) return showToast('Escribe un nombre', '', true);
    appState.setTeam([...appState.team, { id: Date.now().toString(36), name, commissionPct: Number(document.getElementById('teamPct').value || 0), commissionFixed: Number(document.getElementById('teamFixed').value || 0) }]);
    document.getElementById('teamBox').innerHTML = teamHTML(appState, store);
    bindTeam(appState, store);
  });
  document.querySelectorAll('[data-team-del]').forEach((button) => button.addEventListener('click', () => {
    appState.setTeam(appState.team.filter((member) => member.id !== button.dataset.teamDel));
    document.getElementById('teamBox').innerHTML = teamHTML(appState, store);
    bindTeam(appState, store);
  }));
  bindSync(appState, store);
}

function bindSync(appState, store) {
  const box = document.getElementById('syncBox');
  if (box?.dataset.syncBound === 'true') return;
  if (box) box.dataset.syncBound = 'true';
  document.getElementById('syncMode')?.addEventListener('click', () => {
    appState.sync.createAccount = !appState.sync.createAccount;
    if (box) { box.innerHTML = syncHTML(appState, store); box.dataset.syncBound = 'false'; }
    bindSync(appState, store);
  });
  document.getElementById('syncAuth')?.addEventListener('click', async (event) => {
    const button = event.currentTarget; const email = document.getElementById('syncEmail')?.value || ''; const password = document.getElementById('syncPassword')?.value || '';
    button.disabled = true; button.textContent = 'Conectando…';
    try {
      const { authenticateSync } = await import('../services/sync.js');
      await authenticateSync(email, password, button.dataset.create === 'true');
      if (box) { box.innerHTML = syncHTML(appState, store); box.dataset.syncBound = 'false'; }
      bindSync(appState, store); showToast(button.dataset.create === 'true' ? 'Cuenta creada' : 'Sesión iniciada');
    } catch (error) { showToast('No se pudo iniciar sesión', error.message, true); button.disabled = false; button.textContent = button.dataset.create === 'true' ? 'Crear cuenta' : 'Iniciar sesión'; }
  });
  document.getElementById('syncSignOut')?.addEventListener('click', async () => {
    const { signOutSync } = await import('../services/sync.js'); await signOutSync();
    if (box) { box.innerHTML = syncHTML(appState, store); box.dataset.syncBound = 'false'; }
    bindSync(appState, store);
  });
  document.getElementById('syncEnabled')?.addEventListener('change', (event) => appState.setSync({ enabled: event.target.checked }));
  document.getElementById('syncNow')?.addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true; button.textContent = 'Sincronizando…';
    const status = document.getElementById('syncStatus'); if (status) status.textContent = 'Sincronizando…';
    try {
      const { syncBidirectional } = await import('../services/sync.js');
      const result = await syncBidirectional(store);
      if (!result.ok) throw new Error(result.error);
      if (status) status.textContent = 'Al día'; showToast('Sincronización lista');
    } catch (error) {
      if (status) status.textContent = 'Error'; showToast('No se pudo sincronizar', error.message, true);
    } finally { button.disabled = false; button.textContent = 'Sincronizar ahora'; }
  });
}
