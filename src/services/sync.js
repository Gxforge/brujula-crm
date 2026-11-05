import { appState } from '../core/app-state.js';
const DEFAULT_ENDPOINT = 'https://brujula-crm-sync.brujulacrm6207.workers.dev/sync';

function getEndpoint() {
  const cfg = appState.sync;
  if (cfg.endpoint && cfg.endpoint.trim()) return cfg.endpoint.trim();
  appState.setSync({ endpoint: DEFAULT_ENDPOINT });
  return DEFAULT_ENDPOINT;
}
function getApiRoot() { return getEndpoint().replace(/\/+$/, '').replace(/\/sync(?:\/.*)?$/, ''); }
function authHeaders() { const token = appState.sync.token || ''; return token ? { Authorization: `Bearer ${token}` } : {}; }
async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}
export async function authenticateSync(email, password, createAccount = false) {
  const response = await fetch(`${getApiRoot()}/auth/${createAccount ? 'register' : 'login'}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: String(email || '').trim(), password: String(password || '') })
  });
  const data = await parseResponse(response);
  appState.setSync({ token: data.token, accountEmail: data.account?.email || String(email).trim(), lastSync: '' });
  return data.account;
}
export async function signOutSync() {
  const token = appState.sync.token;
  if (token) { try { await fetch(`${getApiRoot()}/auth/logout`, { method: 'POST', headers: authHeaders() }); } catch { /* cerrar sesión local aunque no haya red */ } }
  appState.setSync({ token: '', accountEmail: '', lastSync: '', enabled: false });
}
export async function pushToCloud(store) {
  const endpoint = getEndpoint();
  if (!appState.sync.token) throw new Error('Inicia sesión para sincronizar tus dispositivos.');
  const payload = { clients: store.clients, services: store.services, projects: [], updatedAt: new Date().toISOString() };
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
  const result = await parseResponse(response);
  appState.setSync({ lastSync: new Date().toLocaleString('es-ES') });
  return result;
}
export async function pullFromCloud(store) {
  const endpoint = getEndpoint();
  if (!appState.sync.token) throw new Error('Inicia sesión para sincronizar tus dispositivos.');
  const response = await fetch(endpoint, { headers: authHeaders() });
  const data = await parseResponse(response);
  if (Array.isArray(data.clients)) {
    const map = new Map(store.clients.map((c) => [c.id, c]));
    data.clients.forEach((remote) => {
      const local = map.get(remote.id);
      if (!local || new Date(remote.updatedAt || 0) > new Date(local.updatedAt || 0)) map.set(remote.id, remote);
    });
    store.clients = Array.from(map.values());
    if (Array.isArray(data.services) && data.services.length) store.services = data.services;
    store.save();
    appState.setSync({ lastSync: new Date().toLocaleString('es-ES') });
  }
  return data;
}
export async function syncBidirectional(store) {
  try { await pushToCloud(store); const data = await pullFromCloud(store); return { ok: true, data }; }
  catch (e) { return { ok: false, error: e.message }; }
}
export function enableAutoSync(store, intervalMin = 5) {
  setInterval(() => {
    if (appState.sync.enabled && appState.sync.token && appState.sync.endpoint) syncBidirectional(store).catch(() => {});
  }, intervalMin * 60000);
}
