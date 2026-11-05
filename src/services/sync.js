import { appState } from '../core/app-state.js';
const DEFAULT_ENDPOINT = 'https://brujula-crm-sync.brujulacrm6207.workers.dev/sync';

function getEndpoint() {
  const cfg = appState.sync;
  if (cfg.endpoint && cfg.endpoint.trim()) return cfg.endpoint.trim();
  // auto-default si el worker ya está desplegado
  if (!cfg.endpoint) appState.setSync({ endpoint: DEFAULT_ENDPOINT });
  return cfg.endpoint || DEFAULT_ENDPOINT;
}

export async function pushToCloud(store) {
  const cfg = appState.sync; const endpoint = getEndpoint(); if (!endpoint) throw new Error('Sin endpoint configurado');
  const payload = { clients: store.clients, services: store.services, updatedAt: new Date().toISOString() };
  const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}) }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Sync push ${r.status}`);
  const j = await r.json().catch(() => ({}));
  appState.setSync({ lastSync: new Date().toLocaleString('es-ES') });
  return j;
}
export async function pullFromCloud(store) {
  const cfg = appState.sync; const endpoint = getEndpoint(); if (!endpoint) throw new Error('Sin endpoint');
  const r = await fetch(endpoint, { headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {} });
  if (!r.ok) throw new Error(`Sync pull ${r.status}`);
  const data = await r.json();
  if (Array.isArray(data.clients)) {
    // merge simple: si local vacío usa remoto, si no merge por id y updatedAt
    const map = new Map(store.clients.map((c) => [c.id, c]));
    data.clients.forEach((rc) => {
      const local = map.get(rc.id);
      if (!local) map.set(rc.id, rc);
      else if (new Date(rc.updatedAt || 0) > new Date(local.updatedAt || 0)) map.set(rc.id, rc);
    });
    store.clients = Array.from(map.values());
    store.save();
    appState.setSync({ lastSync: new Date().toLocaleString('es-ES') });
  }
  return data;
}
export async function syncBidirectional(store) {
  try { await pushToCloud(store); const data = await pullFromCloud(store); return { ok: true, data }; } catch (e) { return { ok: false, error: e.message }; }
}
export function enableAutoSync(store, intervalMin = 5) {
  setInterval(() => { if (appState.sync.enabled && appState.sync.endpoint) pushToCloud(store).catch(() => {}); }, intervalMin * 60000);
}
