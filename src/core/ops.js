import { cryptoId } from './utils.js';
export function addPayment(store, cId, pId, pay) {
  const c = store.getById(cId); const p = c?.projects.find((x) => x.id === pId); if (!p) return;
  const entry = { id: cryptoId('pay'), date: pay.date || new Date().toISOString().slice(0, 10), amount: Number(pay.amount || 0), currency: pay.currency || p.currency, method: pay.method || 'Efectivo', note: pay.note || '' };
  p.payments.push(entry); p.paid = p.payments.reduce((s, x) => s + Number(x.amount || 0), 0); c.updatedAt = new Date().toISOString(); pushTimeline(c, '💵 Abono', `${entry.amount} ${entry.currency} · ${entry.method}`);
  store.save(); return entry;
}
export function removePayment(store, cId, pId, payId) {
  const c = store.getById(cId); const p = c?.projects.find((x) => x.id === pId); if (!p) return;
  p.payments = p.payments.filter((x) => x.id !== payId); p.paid = p.payments.reduce((s, x) => s + Number(x.amount || 0), 0); store.save();
}
export function toggleAddon(store, cId, pId, addon) {
  const c = store.getById(cId); const p = c?.projects.find((x) => x.id === pId); if (!p) return;
  const idx = p.addons.findIndex((a) => a.id === addon.id); if (idx >= 0) p.addons.splice(idx, 1); else p.addons.push(addon);
  // price includes base + addons sum for display; keep base price + addons separate
  c.updatedAt = new Date().toISOString(); store.save();
}
export function pushTimeline(client, type, note) {
  if (!client.timeline) client.timeline = []; client.timeline.unshift({ id: cryptoId('ev'), at: new Date().toISOString(), type, note }); if (client.timeline.length > 100) client.timeline.length = 100;
}
export function setCadenceStep(store, cId, step) {
  const c = store.getById(cId); if (!c) return; if (!c.cadence) c.cadence = { step: 1, startedAt: new Date().toISOString(), lastAt: new Date().toISOString() };
  c.cadence.step = Math.max(1, Math.min(4, Number(step))); c.cadence.lastAt = new Date().toISOString(); c.nextDate = new Date(Date.now() + [0, 3, 7, 14][c.cadence.step - 1] * 86400000).toISOString().slice(0, 10); pushTimeline(c, '📞 Cadencia', `Paso ${c.cadence.step}/4`); store.save();
}
export function addTimelineNote(store, cId, type, note) { const c = store.getById(cId); if (!c || !note) return; pushTimeline(c, type, note); c.updatedAt = new Date().toISOString(); store.save(); }
export function setAudit(store, cId, audit) { const c = store.getById(cId); if (!c) return; c.audit = audit; pushTimeline(c, '🔍 Auditoría', `Score ${Object.values(audit).filter(Boolean).length} puntos`); store.save(); }
export function mergeClients(store, keepId, removeId) {
  const keep = store.getById(keepId), rem = store.getById(removeId); if (!keep || !rem) return;
  keep.projects = [...keep.projects, ...rem.projects]; keep.timeline = [...(keep.timeline || []), ...(rem.timeline || [])]; keep.notes = `${keep.notes}\n--- Fusionado de ${rem.name} ---\n${rem.notes}`.trim(); pushTimeline(keep, '🔗 Fusión', `Fusionado con ${rem.name}`);
  store.deleteMany([removeId]); store.save();
}
export function requestNotificationPermission(appState) {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') { appState.setNotif(true); return true; }
  Notification.requestPermission().then((p) => { if (p === 'granted') appState.setNotif(true); });
  return Notification.permission === 'granted';
}
export function triggerReminderCheck(store, appState) {
  if (!appState.notif.enabled || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  const due = store.clients.filter((c) => c.nextDate === today).slice(0, 5);
  if (due.length) new Notification(`Brújula CRM · ${due.length} seguimientos hoy`, { body: due.map((c) => c.name).join(', ') });
}
