import { esc } from '../core/utils.js';
import { daysUntil, renewalAlertLevel, calcMRR, upsellCandidates } from '../data/retainers.js';
import { buildWhatsAppUrl, openExternalUrl } from '../core/utils.js';

export function renderRenewals(store) {
  const list = []; store.clients.forEach((c) => (c.projects || []).forEach((p) => { if (p.nextRenewal || p.vault?.expiresAt) { const d = daysUntil(p.nextRenewal || p.vault.expiresAt); const lvl = renewalAlertLevel(d); if (lvl) list.push({ client: c, proj: p, d, lvl }); } })); list.sort((a, b) => a.d - b.d);
  if (!list.length) return '<div style="font-size:12px;color:#94a3b8">Sin vencimientos próximos.</div>';
  return list.slice(0, 8).map((e) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px"><span><b>${esc(e.client.name)}</b> · ${esc(e.proj.title)}<div style="font-size:11px;color:var(--mut)">${esc(e.proj.vault?.domain || '')} · vence ${e.proj.nextRenewal || e.proj.vault.expiresAt}</div></span><span class="renew-chip" style="background:${e.lvl.color};color:#fff">${e.lvl.label}</span></div>`).join('');
}
export function renderMRR(store, appState) {
  const { mrr, oneOff } = calcMRR(store.clients); const rates = appState.rates;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div class="mini-kpi"><small>MRR fijo</small><b style="font-size:16px">${mrr} USD</b><span style="font-size:11px;color:var(--mut)">hosting + mantenimiento</span></div>
    <div class="mini-kpi"><small>Ventas únicas</small><b style="font-size:16px">${oneOff} USD</b><span style="font-size:11px;color:var(--mut)">proyectos puntuales</span></div>
  </div>`;
}
export function renderUpsell(store) {
  const ups = upsellCandidates(store.clients);
  if (!ups.length) return '<div style="font-size:12px;color:#94a3b8">Sin candidatos a upsell (>30d básico).</div>';
  return ups.map((c) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px"><span><b>${esc(c.name)}</b> · ${esc(c.projects[0]?.title || '')}</span><button class="chip-btn" data-upsell="${esc(c.id)}">Ofrecer Pro</button></div>`).join('');
}
export function renderReferrals(store) {
  const counts = {}; store.clients.forEach((c) => { if (c.referredBy) counts[c.referredBy] = (counts[c.referredBy] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => { const ref = store.getById(id); return { name: ref ? ref.name : id, n }; });
  if (!top.length) return '<div style="font-size:12px;color:#94a3b8">Aún sin referidos. Asigna "Referido por" en la ficha.</div>';
  return top.map((t) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span>🏆 ${esc(t.name)}</span><b>${t.n} referidos</b></div>`).join('');
}
export function bindRenewals(store, handlers) {
  document.querySelectorAll('[data-upsell]').forEach((b) => b.onclick = () => handlers.openDetail(b.dataset.upsell));
}
