import { buildWhatsAppUrl, openExternalUrl } from '../core/utils.js';
import { isGoingCold } from '../data/cadence.js';
import { daysUntil } from '../data/retainers.js';

const RULES = [
  { id: 'cold', label: 'Enfriamiento 4d', check: (c) => isGoingCold(c) > 0, tpl: (c) => `¡Hola ${c.contact || 'equipo'}! ¿Viste la propuesta para ${c.desiredProject || 'tu proyecto'} en ${c.name}? Tengo cupo esta semana para dejarlo listo.` },
  { id: 'cadence', label: 'Cadencia paso vencido', check: (c) => {
      const today = new Date().toISOString().slice(0,10);
      if (c.cadence && c.nextDate && c.nextDate <= today) return true;
      // también si cadence está activo y último contacto hace >2 días sin nextDate
      if (c.cadence && !c.nextDate) {
        const last = c.cadence.lastAt || c.updatedAt;
        const diff = Math.floor((Date.now() - new Date(last).getTime())/86400000);
        return diff >= 2 && ['Pendiente','Contactado','Seguimiento','Propuesta'].includes(c.status);
      }
      return false;
    }, tpl: (c) => `Hola ${c.contact || ''}, te toca el paso ${c.cadence?.step||1}/4 para ${c.name}. ¿Avanzamos?` },
  { id: 'renewal', label: 'Renovación 7d', check: (c) => (c.projects || []).some((p) => { const d = daysUntil(p.nextRenewal || p.vault?.expiresAt); return d >= 0 && d <= 7; }), tpl: (c) => `¡Hola ${c.contact || ''}! Tu hosting/dominio de ${c.name} vence pronto. ¿Renovamos y mantenemos todo activo?` },
  { id: 'debt', label: 'Deuda pendiente', check: (c) => (c.projects || []).some((p) => { const tot = Number(p.price || 0) + (p.addons || []).reduce((s, a) => s + Number(a.price || 0), 0); return Math.max(0, tot - Number(p.paid || 0)) > 0 && ['Entregado', 'Revisión'].includes(p.stage); }), tpl: (c) => `Hola ${c.contact || ''}, te queda saldo pendiente en ${c.name}. ¿Coordinamos el cierre?` }
];

export function scanAutomations(clients) {
  const out = [];
  clients.forEach((c) => {
    RULES.forEach((r) => { if (r.check(c)) out.push({ client: c, rule: r, msg: r.tpl(c), url: buildWhatsAppUrl(c.phone, r.tpl(c)) }); });
  });
  return out;
}
export function runAutomationCheck(store, appState, silent = false) {
  const hits = scanAutomations(store.clients);
  if (!hits.length) return [];
  if (!silent && hits.length && 'Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(`Brújula: ${hits.length} recordatorios WA`, { body: hits.slice(0, 3).map((h) => `${h.client.name} · ${h.rule.label}`).join('\n') });
    n.onclick = () => window.focus();
  }
  // guardar último chequeo
  if (appState) appState.setGoals({ ...appState.goals, lastAutoCheck: new Date().toISOString() });
  return hits;
}
export function scheduleAutomation(store, appState, minutes = 60) {
  setInterval(() => runAutomationCheck(store, appState, false), minutes * 60000);
  // chequeo diario 9am
  const now = new Date(); const next9 = new Date(); next9.setHours(9, 0, 0, 0); if (next9 <= now) next9.setDate(next9.getDate() + 1);
  setTimeout(() => { runAutomationCheck(store, appState, false); setInterval(() => runAutomationCheck(store, appState, false), 24 * 3600000); }, next9 - now);
}
