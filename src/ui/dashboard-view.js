import { $, CUBA_PROVINCES, STAGES, esc, formatDate, initials, relativeTime } from '../core/utils.js';

export function renderDashboard(store, handlers) {
  const clients = store.clients;
  const total = clients.length;
  const countBy = (st) => clients.filter((c) => c.status === st).length;
  const activeProvinces = new Set(clients.map((c) => c.province).filter(Boolean));

  $('#mTotal').textContent = total;
  $('#mPending').textContent = countBy('Pendiente');
  $('#mContacted').textContent = countBy('Contactado');
  $('#mFollowup').textContent = countBy('Seguimiento') + countBy('Propuesta');
  $('#mConverted').textContent = countBy('Convertido');
  $('#mProvinces').textContent = `${activeProvinces.size}/16`;

  const banner = $('#seedBanner');
  if (banner) {
    banner.style.display = total === 0 ? 'flex' : 'none';
  }

  // Embudo comercial
  const maxStage = Math.max(total, 1);
  $('#funnelTotal').textContent = `${total} prospecto${total === 1 ? '' : 's'}`;
  $('#pipeline').innerHTML = STAGES.map((st) => {
    const n = countBy(st.id);
    const pct = Math.round((n / maxStage) * 100);
    return `
      <div class="stage">
        <span class="stage-label">${esc(st.label)}</span>
        <div class="stage-bar"><i style="background:${st.color};width:${pct}%"></i></div>
        <strong>${n}</strong>
      </div>
    `;
  }).join('');

  // Cobertura por provincias de Cuba
  const provCounts = {};
  clients.forEach((c) => {
    const p = c.province || 'Sin provincia';
    provCounts[p] = (provCounts[p] || 0) + 1;
  });

  const allProvNames = Array.from(new Set([...CUBA_PROVINCES, ...Object.keys(provCounts)]));
  $('#provGrid').innerHTML = allProvNames.map((prov) => {
    const count = provCounts[prov] || 0;
    return `
      <button type="button" class="prov-chip" data-prov="${esc(prov)}" style="opacity:${count ? 1 : 0.52}">
        <span>${esc(prov)}</span>
        <b>${count}</b>
      </button>
    `;
  }).join('');

  $('#provGrid').onclick = (e) => {
    const chip = e.target.closest('[data-prov]');
    if (chip) handlers.filterByProvince(chip.dataset.prov);
  };

  // Seguimientos próximos + Actividad reciente
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = clients
    .filter((c) => c.nextDate && c.status !== 'Convertido' && c.status !== 'Descartado')
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    .slice(0, 4);

  const followEl = $('#upcomingList');
  if (followEl) {
    followEl.innerHTML = upcoming.length
      ? upcoming.map((c) => {
          const overdue = c.nextDate < todayIso;
          return `
            <div class="activity-row" data-open-id="${esc(c.id)}" style="cursor:pointer">
              <div class="avatar" style="${overdue ? 'background:#fceaea;color:#a94449' : ''}">${esc(initials(c.name))}</div>
              <div>
                <p><b>${esc(c.name)}</b> · ${esc(c.province || 'Cuba')}</p>
                <time style="${overdue ? 'color:#b43e44;font-weight:700' : ''}">
                  ${overdue ? 'Vencido: ' : 'Programado: '}${esc(formatDate(c.nextDate))}
                </time>
              </div>
            </div>
          `;
        }).join('')
      : `<div style="padding:18px 4px;color:var(--muted);font-size:12px">No tienes seguimientos con fecha pendiente. Asigna fechas en cualquier ficha para recibir alertas aquí.</div>`;

    followEl.onclick = (e) => {
      const row = e.target.closest('[data-open-id]');
      if (row) handlers.openDetail(row.dataset.openId);
    };
  }

  // Actividad reciente
  const logs = store.activities.slice(0, 7);
  $('#activity').innerHTML = logs.length
    ? logs.map((item) => `
        <div class="activity-row">
          <div class="avatar">${esc(initials(item.subject))}</div>
          <div>
            <p><b>${esc(item.subject)}</b> · ${esc(item.action)}</p>
            <time>${esc(relativeTime(item.at))}</time>
          </div>
        </div>
      `).join('')
    : `<div style="padding:22px 4px;text-align:center;color:var(--muted);font-size:12.5px">Importa tu tabla Excel o carga los 35 prospectos de Cuba para comenzar.</div>`;
}
