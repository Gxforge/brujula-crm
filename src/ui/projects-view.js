import { $, $$, ICONS, buildWhatsAppUrl, esc, formatDate, initials, norm, openExternalUrl, showToast } from '../core/utils.js';
import { PROJECT_STAGES, buildProjectQuoteMessage } from '../data/project-catalog.js';

export class ProjectsView {
  constructor(store, handlers) {
    this.store = store;
    this.handlers = handlers;
    this.tab = 'board';
    this.bindStaticEvents();
  }

  bindStaticEvents() {
    $$('[data-proj-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.projTab;
        $$('[data-proj-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        this.render();
      });
    });

    $('#projSearch')?.addEventListener('input', () => this.render());
    $('#projStageFilter')?.addEventListener('change', () => this.render());
    $('#newServiceBtn')?.addEventListener('click', () => this.handlers.openServiceForm());
  }

  getAllProjectEntries() {
    const items = [];
    this.store.clients.forEach((client) => {
      (client.projects || []).forEach((proj) => {
        items.push({ client, proj });
      });
    });
    return items;
  }

  render() {
    const entries = this.getAllProjectEntries();
    const active = entries.filter(({ proj }) => proj.stage !== 'Pausado');
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

    const filterBar = $('#projFilterBar');
    if (filterBar) filterBar.style.display = this.tab === 'board' ? 'flex' : 'none';

    const wrap = $('#projectsContainer');
    if (!wrap) return;
    if (this.tab === 'catalog') this.renderCatalog(wrap);
    else this.renderProjectBoard(wrap, entries);
  }

  renderProjectBoard(wrap, entries) {
    const q = norm($('#projSearch')?.value || '');
    const st = $('#projStageFilter')?.value || '';
    const filtered = entries.filter(({ client, proj }) => {
      if (st && proj.stage !== st) return false;
      if (q && !norm([client.name, client.province, proj.title, proj.notes, proj.stage].join(' ')).includes(q)) return false;
      return true;
    });

    if (!entries.length) {
      wrap.innerHTML = `<div class="panel empty-state">
        <h2>Aún no hay proyectos asignados a clientes</h2>
        <p>Abre cualquier cliente (o créalo) y elige qué proyecto solicitó del catálogo: Menú QR, Tienda Online, POS, Web o App Android.</p>
        <div class="empty-actions">
          <button class="btn btn-primary" data-paction="go-clients">Ir a Clientes para asignar proyecto</button>
          <button class="btn btn-secondary" data-paction="go-catalog">Ver Catálogo de Paquetes (${this.store.services.length})</button>
        </div>
      </div>`;
      return this.bindWrapEvents(wrap);
    }

    if (!filtered.length) {
      wrap.innerHTML = `<div class="panel empty-state"><h2>Sin proyectos que coincidan con el filtro</h2></div>`;
      return;
    }

    const stageOpts = (cur) => PROJECT_STAGES.filter((s) => s.id !== 'Sin proyecto')
      .map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.label)}</option>`).join('');

    wrap.innerHTML = `<section class="panel" style="overflow:hidden"><div class="table-wrap"><table>
      <thead><tr>
        <th>Cliente / Provincia</th>
        <th>Proyecto Solicitado</th>
        <th>Fase del Proyecto</th>
        <th>Cobro (Abono / Total)</th>
        <th>Entregables</th>
        <th>Entrega</th>
        <th style="text-align:right">Acciones</th>
      </tr></thead>
      <tbody>${filtered.map(({ client, proj }) => {
        const doneCount = proj.checklist.filter((i) => i.done).length;
        const totalChk = proj.checklist.length;
        const pending = Math.max(0, proj.price - proj.paid);
        const pct = proj.price > 0 ? Math.min(100, Math.round((proj.paid / proj.price) * 100)) : 0;
        return `<tr data-open-client="${esc(client.id)}">
          <td><div class="client-cell"><div class="client-initial">${esc(initials(client.name))}</div>
            <div><div class="client-name">${esc(client.name)}</div><div class="client-sub">${esc(client.province || 'Cuba')} · ${esc(client.phone || 'Sin tel.')}</div></div>
          </div></td>
          <td>
            <div style="font-weight:700;color:var(--ink)">📦 ${esc(proj.title)}</div>
            ${proj.notes ? `<div class="client-sub" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(proj.notes)}</div>` : ''}
          </td>
          <td data-no-open><select class="status-inline" data-cproj-client="${esc(client.id)}" data-cproj-id="${esc(proj.id)}">${stageOpts(proj.stage)}</select></td>
          <td>
            <div style="font-weight:700">${proj.paid} / ${proj.price} ${esc(proj.currency)}</div>
            <div style="font-size:11px;color:${pending > 0 ? '#c94726' : '#0f7666'}">${pending > 0 ? `Faltan ${pending} ${esc(proj.currency)}` : 'Pagado 100%'}</div>
            <div class="proj-bar" style="width:110px"><i style="width:${pct}%"></i></div>
          </td>
          <td>${totalChk ? `<b>${doneCount}/${totalChk}</b> listos` : '<span style="color:#94a3b8">—</span>'}</td>
          <td>${proj.deadline ? esc(formatDate(proj.deadline)) : '<span style="color:#94a3b8">Por definir</span>'}</td>
          <td data-no-open><div class="row-actions">
            <button class="icon-btn wa" data-wa-quote="${esc(client.id)}::${esc(proj.id)}" title="Enviar cotización por WhatsApp">${ICONS.chat}</button>
            <button class="icon-btn" data-open-btn="${esc(client.id)}" title="Ver ficha y checklist">${ICONS.edit}</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></section>`;
    this.bindWrapEvents(wrap);
  }

  renderCatalog(wrap) {
    wrap.innerHTML = `<div class="catalog-grid">${this.store.services.map((svc) => `
      <article class="svc-card">
        <div class="svc-top">
          <div>
            <span class="svc-cat">${esc(svc.category)}</span>
            <h3>${esc(svc.name)}</h3>
          </div>
          <div class="svc-price">${svc.price} <small style="font-size:11px;color:var(--muted)">${esc(svc.currency)}</small></div>
        </div>
        <p>${esc(svc.summary)}</p>
        <ul class="svc-list">${(svc.deliverables || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <div class="svc-foot">
          <span style="font-size:11.5px;color:var(--muted)">⏱ Entrega est.: <b>${svc.deliveryDays} días</b></span>
          <div style="display:flex;gap:6px">
            <button type="button" class="chip-btn" data-edit-svc="${esc(svc.id)}">Editar</button>
            <button type="button" class="btn btn-primary" style="padding:6px 11px;font-size:12px" data-use-svc="${esc(svc.id)}">+ Asignar a cliente</button>
          </div>
        </div>
      </article>
    `).join('')}</div>`;
    this.bindWrapEvents(wrap);
  }

  bindWrapEvents(wrap) {
    wrap.onchange = (e) => {
      const cid = e.target.dataset.cprojClient;
      const pid = e.target.dataset.cprojId;
      if (cid && pid) {
        const c = this.store.getById(cid);
        const p = c?.projects.find((x) => x.id === pid);
        if (p) {
          this.store.saveClientProject(cid, { ...p, stage: e.target.value });
          showToast('Fase actualizada', `${p.title} → ${e.target.value}`);
        }
      }
    };

    wrap.onclick = (e) => {
      const pact = e.target.closest('[data-paction]')?.dataset.paction;
      if (pact === 'go-clients') return this.handlers.goto('clients');
      if (pact === 'go-catalog') {
        this.tab = 'catalog';
        $$('[data-proj-tab]').forEach((b) => b.classList.toggle('active', b.dataset.projTab === 'catalog'));
        return this.render();
      }

      const editSvc = e.target.closest('[data-edit-svc]');
      if (editSvc) {
        const svc = this.store.services.find((s) => s.id === editSvc.dataset.editSvc);
        return this.handlers.openServiceForm(svc);
      }

      const useSvc = e.target.closest('[data-use-svc]');
      if (useSvc) {
        const svc = this.store.services.find((s) => s.id === useSvc.dataset.useSvc);
        return this.handlers.openFormWithService(svc);
      }

      const quoteBtn = e.target.closest('[data-wa-quote]');
      if (quoteBtn) {
        e.stopPropagation();
        const [cid, pid] = quoteBtn.dataset.waQuote.split('::');
        const c = this.store.getById(cid);
        const p = c?.projects.find((x) => x.id === pid);
        if (!c || !p) return;
        const url = buildWhatsAppUrl(c.phone, buildProjectQuoteMessage(c, p));
        return url ? openExternalUrl(url) : showToast('Sin teléfono', 'Añade el móvil del cliente primero.', true);
      }

      const openBtn = e.target.closest('[data-open-btn]');
      if (openBtn) {
        e.stopPropagation();
        return this.handlers.openDetail(openBtn.dataset.openBtn);
      }

      if (!e.target.closest('[data-no-open]')) {
        const row = e.target.closest('[data-open-client]');
        if (row) this.handlers.openDetail(row.dataset.openClient);
      }
    };
  }
}
