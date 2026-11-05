import { $, $$, ICONS, buildWhatsAppUrl, esc, formatDate, initials, norm, openExternalUrl, showToast } from '../core/utils.js';
import { PROJECT_STAGES, buildProjectQuoteMessage, buildTieredQuoteMessage } from '../data/project-catalog.js';
import { PRODUCTION_STAGES, onboardingPct, hourlyRate } from '../data/production.js';

export class ProjectsView {
  constructor(store, handlers) { this.store = store; this.handlers = handlers; this.tab = 'board'; this.bindStaticEvents(); }
  bindStaticEvents() {
    $$('[data-proj-tab]').forEach((btn) => btn.addEventListener('click', () => { this.tab = btn.dataset.projTab; $$('[data-proj-tab]').forEach((b) => b.classList.toggle('active', b === btn)); this.render(); }));
    $('#projSearch')?.addEventListener('input', () => this.render());
    $('#projStageFilter')?.addEventListener('change', () => this.render());
    $('#newServiceBtn')?.addEventListener('click', () => this.handlers.openServiceForm());
  }
  getAllEntries() { const items = []; this.store.clients.forEach((cl) => (cl.projects || []).forEach((pr) => items.push({ client: cl, proj: pr }))); return items; }
  render() {
    const entries = this.getAllEntries(); const active = entries.filter(({ proj }) => proj.stage !== 'Pausado');
    const delivered = entries.filter(({ proj }) => proj.stage === 'Entregado').length;
    const totalQuoted = active.reduce((s, x) => s + Number(x.proj.price || 0), 0);
    const totalPaid = active.reduce((s, x) => s + Number(x.proj.paid || 0), 0);
    const totalPending = Math.max(0, totalQuoted - totalPaid);
    if ($('#pmActive')) $('#pmActive').textContent = active.length;
    if ($('#pmQuoted')) $('#pmQuoted').textContent = `$${totalQuoted.toLocaleString('es-ES')}`;
    if ($('#pmPaid')) $('#pmPaid').textContent = `$${totalPaid.toLocaleString('es-ES')}`;
    if ($('#pmPending')) $('#pmPending').textContent = `$${totalPending.toLocaleString('es-ES')}`;
    if ($('#pmDelivered')) $('#pmDelivered').textContent = delivered;
    if ($('#sideProjCount')) $('#sideProjCount').textContent = active.length;
    const filterBar = $('#projFilterBar'); if (filterBar) filterBar.style.display = this.tab === 'board' ? 'flex' : 'none';
    const wrap = $('#projectsContainer'); if (!wrap) return;
    if (this.tab === 'catalog') this.renderCatalog(wrap);
    else if (this.tab === 'production') this.renderProduction(wrap, entries);
    else this.renderBoard(wrap, entries);
  }
  renderBoard(wrap, entries) {
    const q = norm($('#projSearch')?.value || ''); const st = $('#projStageFilter')?.value || '';
    const filtered = entries.filter(({ client, proj }) => { if (st && proj.stage !== st) return false; if (q && !norm([client.name, client.province, proj.title, proj.notes, proj.stage].join(' ')).includes(q)) return false; return true; });
    if (!entries.length) {
      wrap.innerHTML = `<div class="panel empty-state"><h2>Aún no hay proyectos asignados</h2><p>Asigna un paquete del catálogo a cualquier cliente para empezar.</p><div class="empty-actions"><button class="btn btn-primary" data-paction="go-clients">Ir a Clientes</button><button class="btn btn-secondary" data-paction="go-catalog">Ver Catálogo (${this.store.services.length})</button></div></div>`;
      return this.bindWrap(wrap);
    }
    if (!filtered.length) { wrap.innerHTML = `<div class="panel empty-state"><h2>Sin coincidencias</h2></div>`; return; }
    const stageOpts = (cur) => PROJECT_STAGES.filter((s) => s.id !== 'Sin proyecto').map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
    wrap.innerHTML = `<section class="panel" style="overflow:hidden"><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Proyecto</th><th>Fase comercial</th><th>Cobro</th><th>Producción</th><th>Entrega</th><th style="text-align:right">Acciones</th></tr></thead><tbody>${filtered.map(({ client, proj }) => {
      const done = proj.checklist.filter((i) => i.done).length; const tot = proj.checklist.length; const pend = Math.max(0, proj.price - proj.paid); const pct = proj.price > 0 ? Math.min(100, Math.round((proj.paid / proj.price) * 100)) : 0;
      const prodBadge = proj.productionStage ? `<span class="prod-mini">${esc(proj.productionStage)}</span>` : '<span style="font-size:11px;color:#94a3b8">—</span>';
      return `<tr data-open-client="${esc(client.id)}"><td><div class="client-cell"><div class="client-initial">${esc(initials(client.name))}</div><div><div class="client-name">${esc(client.name)}</div><div class="client-sub">${esc(client.province || 'Cuba')} · ${esc(client.phone || 'Sin tel.')}</div></div></div></td>
      <td><div style="font-weight:700;color:var(--ink)">📦 ${esc(proj.title)}</div>${proj.notes ? `<div class="client-sub" style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(proj.notes)}</div>` : ''}${tot ? `<div style="font-size:11px;color:var(--muted)">${done}/${tot} entregables</div>` : ''}</td>
      <td data-no-open><select class="status-inline" data-cproj-client="${esc(client.id)}" data-cproj-id="${esc(proj.id)}">${stageOpts(proj.stage)}</select></td>
      <td><div style="font-weight:700">${proj.paid} / ${proj.price} ${esc(proj.currency)}</div><div style="font-size:11px;color:${pend > 0 ? '#c94726' : '#0f7666'}">${pend > 0 ? `Faltan ${pend}` : 'Pagado'}</div><div class="proj-bar" style="width:100px"><i style="width:${pct}%"></i></div></td>
      <td>${prodBadge}${proj.productionStage === 'Faltan insumos' ? `<div style="font-size:10.5px;color:#9c6f09">${onboardingPct(proj.onboarding)}% insumos</div>` : ''}</td>
      <td>${proj.deadline ? esc(formatDate(proj.deadline)) : '<span style="color:#94a3b8">—</span>'}</td>
      <td data-no-open><div class="row-actions"><button class="icon-btn wa" data-wa-quote="${esc(client.id)}::${esc(proj.id)}">${ICONS.chat}</button><button class="icon-btn" data-open-btn="${esc(client.id)}">${ICONS.edit}</button></div></td></tr>`;
    }).join('')}</tbody></table></div></section>`;
    this.bindWrap(wrap);
  }
  renderProduction(wrap, entries) {
    const prodEntries = entries.filter(({ proj }) => proj.productionStage);
    if (!prodEntries.length) {
      wrap.innerHTML = `<div class="panel empty-state"><h2>🚀 Tablero de Producción vacío</h2><p>Cuando un proyecto pasa a <b>Aprobado (Anticipo)</b> o <b>En desarrollo</b>, entra automáticamente aquí para gestionar la entrega técnica.</p><p style="font-size:12px;color:var(--muted)">Flujo técnico: <b>Faltan insumos → En diseño → Revisión del dueño → Publicado</b></p><button class="btn btn-primary" data-paction="go-board">Volver a Proyectos</button></div>`;
      return this.bindWrap(wrap);
    }
    const byStage = {}; PRODUCTION_STAGES.forEach((s) => byStage[s.id] = []);
    prodEntries.forEach((e) => { const k = e.proj.productionStage || 'Faltan insumos'; (byStage[k] || byStage['Faltan insumos']).push(e); });
    wrap.innerHTML = `<div class="prod-kanban">${PRODUCTION_STAGES.map((st) => {
      const items = byStage[st.id] || [];
      return `<div class="kanban-col" data-kanban="${esc(st.id)}"><div class="kanban-head" style="border-top:3px solid ${st.color}"><span class="kanban-title">${st.icon} ${esc(st.label)}</span><span class="kanban-count">${items.length}</span></div><div class="kanban-hint">${esc(st.hint)}</div><div class="kanban-list">${items.length ? items.map(({ client, proj }) => {
        const obPct = onboardingPct(proj.onboarding); const rate = hourlyRate(proj.price, proj.hoursLogged);
        const vaultOk = proj.vault?.url ? '🔗' : '○';
        return `<article class="kanban-card" data-open-client="${esc(client.id)}">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><b style="font-size:12.5px">📦 ${esc(proj.title)}</b><span style="font-size:10.5px;background:#eef4ff;padding:2px 6px;border-radius:6px">${esc(proj.currency)} ${proj.price}</span></div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:2px">${esc(client.name)} · ${esc(client.province || '')}</div>
          <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap"><span class="mini-pill ${obPct === 100 ? 'ok' : ''}">📥 Insumos ${obPct}%</span><span class="mini-pill">🔄 ${proj.revisionsUsed}/${proj.revisionsIncluded}</span><span class="mini-pill">⏱ ${proj.hoursLogged || 0}h ${rate ? `· ${rate}/h` : ''}</span><span class="mini-pill">${vaultOk} Bóveda</span></div>
          ${proj.deadline ? `<div style="font-size:11px;color:#64748b;margin-top:4px">📅 ${esc(formatDate(proj.deadline))}</div>` : ''}
          <div class="kanban-actions" data-no-open>
            <select data-prod-move="${esc(client.id)}::${esc(proj.id)}" style="flex:1;height:26px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;background:#fff">${PRODUCTION_STAGES.map((s) => `<option value="${esc(s.id)}" ${s.id === proj.productionStage ? 'selected' : ''}>→ ${esc(s.label)}</option>`).join('')}</select>
            <button class="icon-btn wa" data-wa-tier="${esc(client.id)}::${esc(proj.id)}" title="Propuesta 3 niveles">${ICONS.chat}</button>
          </div>
        </article>`;
      }).join('') : `<div style="font-size:11.5px;color:#94a3b8;padding:10px;text-align:center">Vacío</div>`}</div></div>`;
    }).join('')}</div>`;
    this.bindWrap(wrap);
  }
  renderCatalog(wrap) {
    wrap.innerHTML = `<div class="catalog-grid">${this.store.services.map((svc) => `<article class="svc-card"><div class="svc-top"><div><span class="svc-cat">${esc(svc.category)}</span><h3>${esc(svc.name)}</h3></div><div class="svc-price">${svc.price} <small style="font-size:11px;color:var(--muted)">${esc(svc.currency)}</small></div></div><p>${esc(svc.summary)}</p><ul class="svc-list">${(svc.deliverables || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul><div class="svc-foot"><span style="font-size:11.5px;color:var(--muted)">⏱ <b>${svc.deliveryDays} días</b></span><div style="display:flex;gap:6px"><button type="button" class="chip-btn" data-edit-svc="${esc(svc.id)}">Editar</button><button type="button" class="btn btn-primary" style="padding:6px 11px;font-size:12px" data-use-svc="${esc(svc.id)}">+ Asignar</button></div></div></article>`).join('')}</div>`;
    this.bindWrap(wrap);
  }
  bindWrap(wrap) {
    wrap.onchange = (e) => {
      const cid = e.target.dataset.cprojClient; const pid = e.target.dataset.cprojId;
      if (cid && pid) { const c = this.store.getById(cid); const p = c?.projects.find((x) => x.id === pid); if (p) { this.store.saveClientProject(cid, { ...p, stage: e.target.value }); showToast('Fase comercial', `${p.title} → ${e.target.value}`); } }
      const mv = e.target.dataset.prodMove; if (mv) { const [cid2, pid2] = mv.split('::'); this.store.setProductionStage(cid2, pid2, e.target.value); showToast('Producción', `Movido a ${e.target.value}`); }
    };
    wrap.onclick = (e) => {
      const pact = e.target.closest('[data-paction]')?.dataset.paction;
      if (pact === 'go-clients') return this.handlers.goto('clients');
      if (pact === 'go-catalog') { this.tab = 'catalog'; $$('[data-proj-tab]').forEach((b) => b.classList.toggle('active', b.dataset.projTab === 'catalog')); return this.render(); }
      if (pact === 'go-board') { this.tab = 'board'; $$('[data-proj-tab]').forEach((b) => b.classList.toggle('active', b.dataset.projTab === 'board')); return this.render(); }
      const editSvc = e.target.closest('[data-edit-svc]'); if (editSvc) { const svc = this.store.services.find((s) => s.id === editSvc.dataset.editSvc); return this.handlers.openServiceForm(svc); }
      const useSvc = e.target.closest('[data-use-svc]'); if (useSvc) { const svc = this.store.services.find((s) => s.id === useSvc.dataset.useSvc); return this.handlers.openFormWithService(svc); }
      const wa = e.target.closest('[data-wa-quote]'); if (wa) { e.stopPropagation(); const [cid, pid] = wa.dataset.waQuote.split('::'); const c = this.store.getById(cid); const p = c?.projects.find((x) => x.id === pid); if (!c || !p) return; const url = buildWhatsAppUrl(c.phone, buildProjectQuoteMessage(c, p)); return url ? openExternalUrl(url) : showToast('Sin teléfono', 'Añade móvil.', true); }
      const waT = e.target.closest('[data-wa-tier]'); if (waT) { e.stopPropagation(); const [cid, pid] = waT.dataset.waTier.split('::'); const c = this.store.getById(cid); const p = c?.projects.find((x) => x.id === pid); if (!c || !p) return; const url = buildWhatsAppUrl(c.phone, buildTieredQuoteMessage(c, p)); return url ? openExternalUrl(url) : showToast('Sin teléfono', 'Añade móvil.', true); }
      const openBtn = e.target.closest('[data-open-btn]'); if (openBtn) { e.stopPropagation(); return this.handlers.openDetail(openBtn.dataset.openBtn); }
      if (!e.target.closest('[data-no-open]')) { const row = e.target.closest('[data-open-client]'); if (row) this.handlers.openDetail(row.dataset.openClient); }
    };
  }
}
