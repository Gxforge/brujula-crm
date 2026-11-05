import { $, CUBA_PROVINCES, STAGES, esc, formatDate, initials, relativeTime } from '../core/utils.js';
import { renderDebtors } from './finance-panel.js';
import { renderRenewals, renderMRR, renderUpsell, renderReferrals } from './renewals-panel.js';
import { goalsHTML, analyticsHTML } from './goals-panel.js';
import { lossStats } from './audit-panel.js';
import { renderAdvancedDashboard } from './analytics-advanced.js';
import { scanAutomations } from '../services/automation.js';

export function renderDashboard(store, handlers, appState) {
  const clients = store.clients; const total = clients.length;
  const countBy = (st) => clients.filter((c) => c.status === st).length;
  const activeProvinces = new Set(clients.map((c) => c.province).filter(Boolean));
  const totalProjects = clients.reduce((a, c) => a + (c.projects?.length || 0), 0);
  const totalQuoted = clients.reduce((a, c) => a + Number(c.value || 0), 0);
  $('#mTotal').textContent = total; $('#mPending').textContent = countBy('Pendiente'); $('#mContacted').textContent = countBy('Contactado');
  $('#mProjects').textContent = totalProjects; $('#mProjectsNote').textContent = totalQuoted ? `$${totalQuoted.toLocaleString('es-ES')} cotizados` : 'pedidos';
  $('#mConverted').textContent = countBy('Convertido'); $('#mProvinces').textContent = `${activeProvinces.size}/16`;
  const maxStage = Math.max(total, 1); $('#funnelTotal').textContent = `${total} prospectos`;
  $('#pipeline').innerHTML = STAGES.map((st) => { const n = countBy(st.id); const pct = Math.round((n / maxStage) * 100); return `<div class="stage"><span class="stage-label">${esc(st.label)}</span><div class="stage-bar"><i style="background:${st.color};width:${pct}%"></i></div><strong>${n}</strong></div>`; }).join('');
  const provCounts = {}; clients.forEach((c) => { const p = c.province || 'Sin provincia'; provCounts[p] = (provCounts[p] || 0) + 1; });
  const allProvNames = Array.from(new Set([...CUBA_PROVINCES, ...Object.keys(provCounts)]));
  $('#provGrid').innerHTML = allProvNames.map((prov) => { const count = provCounts[prov] || 0; return `<button type="button" class="prov-chip" data-prov="${esc(prov)}" style="opacity:${count ? 1 : 0.52}"><span>${esc(prov)}</span><b>${count}</b></button>`; }).join('');
  $('#provGrid').onclick = (e) => { const chip = e.target.closest('[data-prov]'); if (chip) handlers.filterByProvince(chip.dataset.prov); };
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = clients.filter((c) => c.nextDate && c.status !== 'Convertido' && c.status !== 'Descartado').sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 4);
  const followEl = $('#upcomingList');
  if (followEl) {
    followEl.innerHTML = upcoming.length ? upcoming.map((c) => {
      const overdue = c.nextDate < todayIso;
      return `<div class="activity-row" data-open-id="${esc(c.id)}" style="cursor:pointer"><div class="avatar" style="${overdue ? 'background:#fceaea;color:#a94449' : ''}">${esc(initials(c.name))}</div><div><p><b>${esc(c.name)}</b>${c.desiredProject ? ` · 📦 ${esc(c.desiredProject)}` : ` · ${esc(c.province || 'Cuba')}`}</p><time style="${overdue ? 'color:#b43e44;font-weight:700' : ''}">${overdue ? 'Vencido: ' : 'Programado: '}${esc(formatDate(c.nextDate))}</time></div></div>`;
    }).join('') : `<div style="padding:18px 4px;color:var(--muted);font-size:12px">Sin seguimientos. Usa +1d/+3d en ficha.</div>`;
    followEl.onclick = (e) => { const row = e.target.closest('[data-open-id]'); if (row) handlers.openDetail(row.dataset.openId); };
  }
  const logs = store.activities.slice(0, 7);
  $('#activity').innerHTML = logs.length ? logs.map((it) => `<div class="activity-row"><div class="avatar">${esc(initials(it.subject))}</div><div><p><b>${esc(it.subject)}</b> · ${esc(it.action)}</p><time>${esc(relativeTime(it.at))}</time></div></div>`).join('') : `<div style="padding:22px 4px;text-align:center;color:var(--muted);font-size:12.5px">Importa tu tabla para comenzar. Base vacía.</div>`;
  // Extras M07-M15 M34-M35
  const gb = $('#goalsBar'); if (gb && appState) gb.innerHTML = goalsHTML(appState, store);
  const mrr = $('#mrrBox'); if (mrr && appState) mrr.innerHTML = renderMRR(store, appState);
  const debt = $('#debtorsBox'); if (debt) debt.innerHTML = `<b style="font-size:12px">M10 · Deudores (saldo pendiente)</b>` + renderDebtors(store);
  const renew = $('#renewBox'); if (renew) renew.innerHTML = renderRenewals(store);
  const ups = $('#upsellBox'); if (ups) ups.innerHTML = `<b style="font-size:12px">M14 · Upsell listo (30d básico)</b>` + renderUpsell(store);
  const ref = $('#referralBox'); if (ref) ref.innerHTML = `<b style="font-size:12px">M15 · Top referidos</b>` + renderReferrals(store);
  const ana = $('#analyticsBox'); if (ana) ana.innerHTML = analyticsHTML(store);
  const loss = $('#lossBox'); if (loss) loss.innerHTML = lossStats(store);
  const adv = $('#advancedBox'); if (adv) adv.innerHTML = renderAdvancedDashboard(store, appState);
  const autoBox = $('#automationBox');
  if (autoBox) {
    const hits = scanAutomations(clients);
    if (!hits.length) autoBox.innerHTML = '';
    else {
      autoBox.innerHTML = `<div class="panel" style="padding:12px;border-left:4px solid #0ea5e9"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">🤖 Automatizaciones WA · ${hits.length} pendientes</b><button class="chip-btn" id="autoRunAll">Abrir todos</button></div><div style="display:grid;gap:6px;margin-top:8px">${hits.slice(0,6).map((h,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:7px;border:1px solid var(--line);border-radius:8px"><span><b>${esc(h.client.name)}</b> · ${esc(h.rule.label)}<br><small style="color:var(--mut)">${esc(h.msg.slice(0,70))}…</small></span><a class="btn btn-aqua" href="${h.url}" target="_blank" style="padding:6px 10px;font-size:11px;text-decoration:none">WA</a></div>`).join('')}</div><div style="font-size:11px;color:#94a3b8;margin-top:6px">Recordatorios automáticos: enfriamiento 4d · cadencia vencida · renovación 7d · deuda. Se programan a las 9:00 y cada 60 min.</div></div>`;
      document.getElementById('autoRunAll')?.addEventListener('click', ()=> hits.slice(0,3).forEach((h,i)=> setTimeout(()=> window.open(h.url,'_blank'), i*700)));
    }
  }
  // bind upsell clicks
  document.querySelectorAll('[data-upsell]').forEach((b) => b.onclick = () => handlers.openDetail(b.dataset.upsell));
  if (appState) {
    document.getElementById('saveGoal')?.addEventListener('click', () => {
      const t = Number(document.getElementById('goalTarget')?.value || 500); const cur = document.getElementById('goalCur')?.value || 'USD';
      appState.setGoals({ monthlyTarget: t, currency: cur }); renderDashboard(store, handlers, appState);
    });
  }
}
