import { esc, showToast } from '../core/utils.js';
import { PAYMENT_METHODS, ADDON_CATALOG, convertToBase } from '../data/finance.js';
import { generateQuoteCanvas, downloadCanvas, generateContractCanvas } from '../services/doc-generator.js';
import { addPayment, removePayment, toggleAddon } from '../core/ops.js';

export function attachFinanceToDetail(store, appState, c, proj, refresh) {
  // Payments M08 + Addons M11 + Quote M09 + Contract M39
  const payments = proj.payments || [];
  const totalAddons = (proj.addons || []).reduce((s, a) => s + Number(a.price || 0), 0);
  const totalPrice = Number(proj.price || 0) + totalAddons;
  return `
  <div class="extra-box">
    <b style="font-size:12px">💳 Historial de abonos (${payments.length}) · Total abonado ${proj.paid} ${esc(proj.currency)}</b>
    <div style="margin-top:6px">${payments.length ? payments.map((pay) => `<div class="pay-row"><span>📅 ${esc(pay.date)} · <b>${pay.amount} ${esc(pay.currency)}</b> · ${esc(pay.method)}</span><span style="color:var(--mut)">${esc(pay.note || '')}</span><button class="chip-btn" data-pay-del="${esc(proj.id)}::${esc(pay.id)}" style="margin-left:auto">×</button></div>`).join('') : '<div style="font-size:11px;color:#94a3b8">Sin abonos aún.</div>'}</div>
    <div class="form-grid" style="gap:6px;margin-top:8px">
      <div class="field"><label>Monto</label><input data-pay-amt="${esc(proj.id)}" type="number" placeholder="50" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"></div>
      <div class="field"><label>Método</label><select data-pay-method="${esc(proj.id)}" style="height:30px;border:1px solid #cbd5e1;border-radius:7px">${PAYMENT_METHODS.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Fecha</label><input data-pay-date="${esc(proj.id)}" type="date" value="${new Date().toISOString().slice(0, 10)}" style="height:30px;border:1px solid #cbd5e1;border-radius:7px"></div>
      <div class="field"><label>Nota</label><input data-pay-note="${esc(proj.id)}" placeholder="Anticipo / saldo" style="height:30px;border:1px solid #cbd5e1;border-radius:7px"></div>
    </div>
    <button class="btn btn-aqua" data-pay-add="${esc(proj.id)}" style="margin-top:6px;padding:6px 10px;font-size:12px">+ Registrar abono</button>
    <div style="margin-top:6px;font-size:11px;color:#64748b">Total proyecto con extras: <b>${totalPrice} ${esc(proj.currency)}</b> · Pendiente: <b style="color:#c94726">${Math.max(0, totalPrice - proj.paid)} ${esc(proj.currency)}</b></div>
  </div>
  <div class="extra-box">
    <b style="font-size:12px">🧩 Extras rápidos (Add-ons)</b><div style="font-size:11px;color:var(--mut)">Se suman al precio base al instante.</div>
    <div style="display:grid;gap:4px;margin-top:6px">${ADDON_CATALOG.map((ad) => `<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" data-addon="${esc(proj.id)}::${esc(ad.id)}" ${proj.addons?.some((a) => a.id === ad.id) ? 'checked' : ''}><span>${esc(ad.name)} · <b>${ad.price} ${ad.currency}</b></span></label>`).join('')}</div>
  </div>
  <div class="extra-box" style="display:flex;gap:6px;flex-wrap:wrap">
    <button class="btn btn-primary" data-gen-quote="${esc(proj.id)}" style="padding:6px 10px;font-size:12px">📄 Generar Cotización PNG</button>
    <button class="btn btn-secondary" data-gen-receipt="${esc(proj.id)}" style="padding:6px 10px;font-size:12px">🧾 Recibo de abonos PNG</button>
    <button class="btn btn-secondary" data-gen-contract="${esc(proj.id)}" style="padding:6px 10px;font-size:12px">📜 Contrato 1 pág. PNG</button>
  </div>`;
}
export function bindFinance(store, appState, c, refresh) {
  const root = document.getElementById('detailContent'); if (!root) return;
  root.querySelectorAll('[data-pay-add]').forEach((btn) => btn.onclick = () => {
    const pid = btn.dataset.payAdd; const amt = Number(root.querySelector(`[data-pay-amt="${pid}"]`)?.value || 0); if (!amt) return showToast('Monto requerido', 'Indica abono.', true);
    addPayment(store, c.id, pid, { amount: amt, method: root.querySelector(`[data-pay-method="${pid}"]`).value, date: root.querySelector(`[data-pay-date="${pid}"]`).value, note: root.querySelector(`[data-pay-note="${pid}"]`).value });
    showToast('Abono registrado', `${amt}`); refresh(c.id);
  });
  root.querySelectorAll('[data-pay-del]').forEach((btn) => btn.onclick = () => { const [pid, payId] = btn.dataset.payDel.split('::'); removePayment(store, c.id, pid, payId); refresh(c.id); });
  root.querySelectorAll('[data-addon]').forEach((chk) => chk.onchange = () => { const [pid, aid] = chk.dataset.addon.split('::'); const ad = ADDON_CATALOG.find((x) => x.id === aid); toggleAddon(store, c.id, pid, ad); refresh(c.id); });
  root.querySelectorAll('[data-gen-quote]').forEach((btn) => btn.onclick = () => { const p = c.projects.find((x) => x.id === btn.dataset.genQuote); const cvs = generateQuoteCanvas(c, p, p.addons || []); downloadCanvas(cvs, `cotizacion-${c.name}-${p.title}.png`); showToast('Cotización PNG descargada'); });
  root.querySelectorAll('[data-gen-receipt]').forEach((btn) => btn.onclick = () => { const p = c.projects.find((x) => x.id === btn.dataset.genReceipt); const cvs = generateQuoteCanvas(c, p, p.addons || []); downloadCanvas(cvs, `recibo-${c.name}.png`); });
  root.querySelectorAll('[data-gen-contract]').forEach((btn) => btn.onclick = () => { const p = c.projects.find((x) => x.id === btn.dataset.genContract); const cvs = generateContractCanvas(c, p); downloadCanvas(cvs, `contrato-${c.name}.png`); });
}

export function renderDebtors(store) {
  const entries = []; store.clients.forEach((cl) => (cl.projects || []).forEach((pr) => { const total = Number(pr.price || 0) + (pr.addons || []).reduce((s, a) => s + Number(a.price || 0), 0); const pending = Math.max(0, total - Number(pr.paid || 0)); if (pending > 0 && ['En desarrollo', 'Revisión', 'Entregado', 'Aprobado'].includes(pr.stage)) { const days = pr.deadline ? Math.floor((Date.now() - new Date(pr.deadline + 'T12:00:00').getTime()) / 86400000) : 0; entries.push({ client: cl, proj: pr, pending, total, days }); } })); entries.sort((a, b) => b.pending - a.pending);
  if (!entries.length) return `<div style="font-size:12px;color:#94a3b8">Sin deudas pendientes.</div>`;
  return entries.slice(0, 10).map((e) => `<div class="debt-row"><div><b>${esc(e.client.name)}</b> · ${esc(e.proj.title)}<div style="font-size:11px;color:#64748b">${e.pending} ${esc(e.proj.currency)} pendientes ${e.days > 0 ? `· vencido ${e.days}d` : ''}</div></div><span style="font-weight:800">${e.pending} ${esc(e.proj.currency)}</span></div>`).join('');
}
export function renderRatesConfig(appState) {
  const r = appState.rates;
  return `<div class="extra-box"><b>M07 · Tasas de cambio internas</b><div style="font-size:11px;color:var(--mut)">Base: ${esc(r.base)} · Ajusta y el Dashboard convierte totales.</div>
  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
    <label>USD 1 = <input data-rate="CUP" value="${r.CUP}" type="number" style="width:70px;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px"> CUP</label>
    <label>1 MLC = <input data-rate="MLC" value="${r.MLC}" type="number" step="0.01" style="width:70px;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px"> USD</label>
    <label>1 EUR = <input data-rate="EUR" value="${r.EUR}" type="number" step="0.01" style="width:70px;height:28px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px"> USD</label>
    <select data-rate-base style="height:28px;border:1px solid #cbd5e1;border-radius:6px"><option ${r.base === 'USD' ? 'selected' : ''}>USD</option><option ${r.base === 'CUP' ? 'selected' : ''}>CUP</option></select>
  </div></div>`;
}
