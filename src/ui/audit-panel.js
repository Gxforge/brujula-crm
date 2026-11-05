import { esc } from '../core/utils.js';
import { PAIN_POINTS, LOSS_REASONS, buildAuditMessage, scoreAudit, findDuplicates } from '../data/diagnostics.js';

export function auditHTML(client) {
  const a = client.audit || {};
  return `<div class="extra-box"><b>M27 · Auditoría visual del negocio</b>
  <div class="audit-grid" style="margin-top:6px">${PAIN_POINTS.map((p) => `<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" data-audit="${p.id}" ${a[p.id] ? 'checked' : ''}> ${esc(p.label)}</label>`).join('')}</div>
  <button class="chip-btn" data-audit-save style="margin-top:6px">Guardar auditoría</button>
  <button class="chip-btn" data-audit-msg style="margin-top:6px">Generar diagnóstico WA</button>
  <div style="font-size:11px;color:var(--mut);margin-top:4px">Score dolor: <b>${scoreAudit(a)}</b>/11</div></div>`;
}
export function bindAudit(store, client, refresh) {
  const root = document.getElementById('detailContent'); if (!root) return;
  root.querySelector('[data-audit-save]')?.addEventListener('click', () => {
    const audit = {}; PAIN_POINTS.forEach((p) => audit[p.id] = root.querySelector(`[data-audit="${p.id}"]`)?.checked || false);
    import('../core/ops.js').then((m) => { m.setAudit(store, client.id, audit); refresh(client.id); });
  });
  root.querySelector('[data-audit-msg]')?.addEventListener('click', () => {
    const audit = {}; PAIN_POINTS.forEach((p) => audit[p.id] = root.querySelector(`[data-audit="${p.id}"]`)?.checked || false);
    const msg = buildAuditMessage(client, audit); const ta = document.getElementById('waPitchText'); if (ta) ta.value = msg;
  });
}
export function duplicatesBanner(store, handlers) {
  const dups = findDuplicates(store.clients);
  if (!dups.length) return '';
  return `<div style="background:#fef9c3;border:1px solid #facc15;padding:8px;border-radius:8px;margin-bottom:10px;font-size:12px">M28 · Posibles duplicados detectados: ${dups.length}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${dups.map((pair) => `<span style="background:#fff;padding:4px 8px;border-radius:6px;border:1px solid #eab308">${esc(pair[0].name)} ↔ ${esc(pair[1].name)} <button class="chip-btn" data-merge="${esc(pair[0].id)}::${esc(pair[1].id)}">Fusionar</button></span>`).join('')}</div></div>`;
}
export function lossStats(store) {
  const counts = {}; store.clients.filter((c) => c.status === 'Descartado').forEach((c) => { const r = c.lossReason || 'Sin motivo'; counts[r] = (counts[r] || 0) + 1; });
  if (!Object.keys(counts).length) return '<div style="font-size:12px;color:#94a3b8">Sin descartados aún.</div>';
  return Object.entries(counts).map(([k, v]) => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(k)}</span><b>${v}</b></div>`).join('');
}
export function promptLossReason(store, id) {
  const r = prompt(`Motivo de descarte (${LOSS_REASONS.join(', ')}):`, 'Precio'); if (r === null) return; const c = store.getById(id); if (c) { c.lossReason = r; c.updatedAt = new Date().toISOString(); store.save(); }
}
