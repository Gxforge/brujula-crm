import { $, $$, ICONS, STAGES, buildWhatsAppUrl, esc, formatDate, initials, norm, openExternalUrl, showToast } from '../core/utils.js';

export class ClientsView {
  constructor(store, handlers) {
    this.store = store;
    this.handlers = handlers;
    this.viewMode = 'table';
    this.sortBy = 'updatedAt';
    this.sortDir = 'desc';
    this.selectedIds = new Set();
    this.bindStaticEvents();
  }

  bindStaticEvents() {
    ['#search', '#statusFilter', '#provinceFilter', '#socialFilter'].forEach((sel) => {
      $(sel)?.addEventListener(sel === '#search' ? 'input' : 'change', () => this.render());
    });

    $$('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.viewMode = btn.dataset.viewMode;
        $$('[data-view-mode]').forEach((b) => b.classList.toggle('active', b === btn));
        this.render();
      });
    });

    $('#bulkApplyBtn')?.addEventListener('click', () => {
      const st = $('#bulkStatusSelect').value;
      if (!st || !this.selectedIds.size) return;
      const n = this.store.bulkUpdateStatus([...this.selectedIds], st);
      this.selectedIds.clear();
      showToast('Actualización en lote', `${n} clientes movidos a ${st}`);
    });

    $('#bulkDeleteBtn')?.addEventListener('click', () => {
      if (!this.selectedIds.size) return;
      if (confirm(`¿Eliminar ${this.selectedIds.size} cliente(s) seleccionados?`)) {
        const n = this.store.deleteMany([...this.selectedIds]);
        this.selectedIds.clear();
        showToast('Registros eliminados', `${n} cliente(s) eliminados`);
      }
    });
  }

  setProvinceFilter(province) {
    this.renderFilters();
    const sel = $('#provinceFilter');
    if (sel) sel.value = province;
    this.render();
  }

  renderFilters() {
    const provSel = $('#provinceFilter');
    if (!provSel) return;
    const current = provSel.value;
    const provinces = [...new Set(this.store.clients.map((c) => c.province).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));
    provSel.innerHTML = `<option value="">Todas las provincias (${provinces.length})</option>` +
      provinces.map((p) => `<option value="${esc(p)}" ${p === current ? 'selected' : ''}>${esc(p)}</option>`).join('');
  }

  getFilteredClients() {
    const q = norm($('#search')?.value || '');
    const st = $('#statusFilter')?.value || '';
    const prov = $('#provinceFilter')?.value || '';
    const soc = norm($('#socialFilter')?.value || '');

    return this.store.clients
      .filter((c) => {
        if (st && c.status !== st) return false;
        if (prov && c.province !== prov) return false;
        if (soc && !norm(c.social).includes(soc)) return false;
        if (q && !norm([c.name, c.contact, c.phone, c.type, c.province, c.address, c.evidence].join(' ')).includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dir = this.sortDir === 'asc' ? 1 : -1;
        return String(a[this.sortBy] || '').localeCompare(String(b[this.sortBy] || ''), 'es', { numeric: true }) * dir;
      });
  }

  render() {
    this.renderFilters();
    const list = this.getFilteredClients();
    const validIds = new Set(this.store.clients.map((c) => c.id));
    this.selectedIds.forEach((id) => { if (!validIds.has(id)) this.selectedIds.delete(id); });

    $('#tableCount').textContent = `${list.length} de ${this.store.clients.length} cliente${this.store.clients.length === 1 ? '' : 's'}`;
    const bulkBar = $('#bulkBar');
    if (bulkBar) {
      bulkBar.style.display = this.selectedIds.size > 0 ? 'flex' : 'none';
      $('#bulkCountText').textContent = `${this.selectedIds.size} seleccionado(s)`;
    }

    const wrap = $('#clientsContainer');
    if (!this.store.clients.length) {
      wrap.innerHTML = `<div class="panel empty-state">
        <div class="empty-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg></div>
        <h2>Tu base comercial está lista para empezar</h2>
        <p>Importa tu archivo Excel (.xlsx o .csv), carga en 1 clic los 35 negocios verificados de Cuba o añade un cliente manualmente.</p>
        <div class="empty-actions">
          <button class="btn btn-aqua" data-action="seed">Cargar 35 prospectos de Cuba</button>
          <button class="btn btn-primary" data-action="import">Importar Excel / CSV</button>
          <button class="btn btn-secondary" data-action="new">Añadir cliente</button>
        </div>
      </div>`;
      return this.bindContainerClicks(wrap, list);
    }

    if (!list.length) {
      wrap.innerHTML = `<div class="panel empty-state">
        <h2>Sin coincidencias con los filtros actuales</h2>
        <p>Prueba otra palabra clave o limpia los filtros activos.</p>
        <div class="empty-actions"><button class="btn btn-secondary" data-action="clear-filters">Limpiar filtros</button></div>
      </div>`;
      return this.bindContainerClicks(wrap, list);
    }

    if (this.viewMode === 'kanban') this.renderKanban(wrap, list);
    else this.renderTable(wrap, list);
    this.bindContainerClicks(wrap, list);
  }

  renderTable(wrap, list) {
    const allChecked = list.length > 0 && list.every((c) => this.selectedIds.has(c.id));
    const arrow = (col) => (this.sortBy === col ? (this.sortDir === 'asc' ? ' ↑' : ' ↓') : '');
    wrap.innerHTML = `<section class="panel" style="overflow:hidden"><div class="table-wrap"><table>
      <thead><tr>
        <th style="width:36px"><input type="checkbox" id="checkAllRows" ${allChecked ? 'checked' : ''}></th>
        <th data-sort="name">Negocio / Rubro${arrow('name')}</th>
        <th data-sort="province">Provincia${arrow('province')}</th>
        <th>Contacto</th><th>Teléfono / WhatsApp</th>
        <th data-sort="status">Estado${arrow('status')}</th>
        <th data-sort="nextDate">Seguimiento${arrow('nextDate')}</th>
        <th style="text-align:right">Acciones</th>
      </tr></thead>
      <tbody>${list.map((c) => `<tr data-row-id="${esc(c.id)}">
        <td data-no-open><input type="checkbox" class="row-check" data-id="${esc(c.id)}" ${this.selectedIds.has(c.id) ? 'checked' : ''}></td>
        <td><div class="client-cell"><div class="client-initial">${esc(initials(c.name))}</div>
          <div><div class="client-name">${esc(c.name)}</div><div class="client-sub">${esc(c.type || 'Sin rubro')}${c.social ? ' · ' + esc(c.social) : ''}</div></div>
        </div></td>
        <td><div style="font-weight:600">${esc(c.province || '—')}</div><div class="client-sub">${esc(c.address || '')}</div></td>
        <td><div style="max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.contact)}">${esc(c.contact || '—')}</div></td>
        <td style="white-space:nowrap;font-weight:600">${esc(c.phone || '—')}</td>
        <td data-no-open><select class="status-inline st-${esc(c.status)}" data-status-id="${esc(c.id)}">
          ${STAGES.map((s) => `<option value="${esc(s.id)}" ${s.id === c.status ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
        </select></td>
        <td>${c.nextDate ? esc(formatDate(c.nextDate)) : '<span style="color:#9aa3b4">Sin fecha</span>'}</td>
        <td data-no-open><div class="row-actions">
          <button class="icon-btn wa" data-wa="${esc(c.id)}" title="Escribir por WhatsApp">${ICONS.chat}</button>
          ${c.evidenceUrl ? `<a class="icon-btn" href="${esc(c.evidenceUrl)}" target="_blank" rel="noopener" title="Ver evidencia FB/IG">${ICONS.link}</a>` : ''}
          <button class="icon-btn" data-edit="${esc(c.id)}" title="Editar cliente">${ICONS.edit}</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div></section>`;
  }

  renderKanban(wrap, list) {
    const stages = STAGES.filter((s) => s.id !== 'Descartado' || list.some((c) => c.status === 'Descartado'));
    wrap.innerHTML = `<div class="kanban-board">${stages.map((st) => {
      const cards = list.filter((c) => c.status === st.id);
      return `<div class="kanban-col" data-drop-stage="${esc(st.id)}">
        <div class="kanban-head">
          <span style="display:flex;align-items:center;gap:6px"><i class="metric-dot" style="background:${st.color}"></i>${esc(st.label)}</span>
          <span class="badge st-${esc(st.id)}">${cards.length}</span>
        </div>
        ${cards.map((c) => `<article class="kanban-card" draggable="true" data-drag-id="${esc(c.id)}" data-row-id="${esc(c.id)}">
          <h4>${esc(c.name)}</h4>
          <p>${esc(c.province || 'Cuba')} · ${esc(c.type || 'Negocio')}</p>
          <div class="kanban-foot">
            <span style="color:#4a566d;font-weight:600">${esc(c.phone || 'Sin tel.')}</span>
            <button class="icon-btn wa" data-wa="${esc(c.id)}" title="WhatsApp">${ICONS.chat}</button>
          </div>
        </article>`).join('')}
      </div>`;
    }).join('')}</div>`;

    $$('[data-drag-id]', wrap).forEach((el) => el.addEventListener('dragstart', (ev) => ev.dataTransfer.setData('text/plain', el.dataset.dragId)));
    $$('[data-drop-stage]', wrap).forEach((col) => {
      col.addEventListener('dragover', (ev) => ev.preventDefault());
      col.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData('text/plain');
        if (id) this.store.updateStatus(id, col.dataset.dropStage);
      });
    });
  }

  bindContainerClicks(wrap, list) {
    $('#checkAllRows', wrap)?.addEventListener('change', (e) => {
      list.forEach((c) => (e.target.checked ? this.selectedIds.add(c.id) : this.selectedIds.delete(c.id)));
      this.render();
    });

    wrap.onchange = (e) => {
      if (e.target.classList.contains('row-check')) {
        e.target.checked ? this.selectedIds.add(e.target.dataset.id) : this.selectedIds.delete(e.target.dataset.id);
        this.render();
      } else if (e.target.dataset.statusId) {
        this.store.updateStatus(e.target.dataset.statusId, e.target.value);
        showToast('Estado actualizado', e.target.value);
      }
    };

    wrap.onclick = (e) => {
      const act = e.target.closest('[data-action]')?.dataset.action;
      if (act) {
        if (act === 'seed') this.handlers.loadCubaSeed();
        if (act === 'import') this.handlers.goto('import');
        if (act === 'new') this.handlers.openForm();
        if (act === 'clear-filters') {
          ['#search', '#statusFilter', '#provinceFilter', '#socialFilter'].forEach((s) => { $(s).value = ''; });
          this.render();
        }
        return;
      }
      const sortCol = e.target.closest('th[data-sort]')?.dataset.sort;
      if (sortCol) {
        this.sortDir = this.sortBy === sortCol && this.sortDir === 'asc' ? 'desc' : 'asc';
        this.sortBy = sortCol;
        return this.render();
      }
      const waBtn = e.target.closest('[data-wa]');
      if (waBtn) {
        e.stopPropagation();
        const url = buildWhatsAppUrl(this.store.getById(waBtn.dataset.wa)?.phone);
        return url ? openExternalUrl(url) : showToast('Sin teléfono', 'Añade un móvil primero.', true);
      }
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) {
        e.stopPropagation();
        return this.handlers.openForm(this.store.getById(editBtn.dataset.edit));
      }
      if (!e.target.closest('[data-no-open]')) {
        const row = e.target.closest('[data-row-id]');
        if (row) this.handlers.openDetail(row.dataset.rowId);
      }
    };
  }
}
