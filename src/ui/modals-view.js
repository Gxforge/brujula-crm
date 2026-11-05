import {
  $,
  CUBA_PROVINCES,
  STAGES,
  buildWhatsAppUrl,
  esc,
  formatDate,
  initials,
  openExternalUrl,
  showToast,
  statusLabel
} from '../core/utils.js';

export class ModalsView {
  constructor(store) {
    this.store = store;
    this.activeClientId = null;
    this.populateStaticOptions();
    this.bindEvents();
  }

  populateStaticOptions() {
    const provList = $('#provinceDatalist');
    if (provList) {
      provList.innerHTML = CUBA_PROVINCES.map((p) => `<option value="${esc(p)}"></option>`).join('');
    }
    const statusSel = $('#fStatus');
    if (statusSel) {
      statusSel.innerHTML = STAGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    }
  }

  bindEvents() {
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close(btn.dataset.close));
    });

    document.querySelectorAll('.modal-layer').forEach((layer) => {
      layer.addEventListener('click', (e) => {
        if (e.target === layer) this.close(layer.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-layer.open').forEach((l) => this.close(l.id));
      }
    });

    $('#clientForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    $('#deleteClientBtn')?.addEventListener('click', () => this.handleDeleteCurrent());
    $('#editFromDetailBtn')?.addEventListener('click', () => {
      const c = this.store.getById(this.activeClientId);
      this.close('detailLayer');
      if (c) this.openForm(c);
    });
  }

  close(layerId) {
    document.getElementById(layerId)?.classList.remove('open');
  }

  openForm(client = null) {
    $('#formTitle').textContent = client ? 'Editar cliente' : 'Añadir nuevo cliente';
    $('#clientId').value = client?.id || '';
    $('#fName').value = client?.name || '';
    $('#fProvince').value = client?.province || '';
    $('#fType').value = client?.type || '';
    $('#fAddress').value = client?.address || '';
    $('#fContact').value = client?.contact || '';
    $('#fPhone').value = client?.phone || '';
    $('#fSocial').value = client?.social || 'Facebook';
    $('#fStatus').value = client?.status || 'Pendiente';
    $('#fDate').value = client?.nextDate || '';
    $('#fEvidenceUrl').value = client?.evidenceUrl || '';
    $('#fEvidence').value = client?.evidence || '';
    $('#fNotes').value = client?.notes || '';
    $('#deleteClientBtn').style.display = client ? 'inline-flex' : 'none';

    $('#formLayer').classList.add('open');
    setTimeout(() => $('#fName')?.focus(), 80);
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const name = $('#fName').value.trim();
    if (!name) {
      showToast('Nombre obligatorio', 'Escribe el nombre del negocio.', true);
      return;
    }

    const { client, isEdit } = this.store.upsertOne({
      id: $('#clientId').value || undefined,
      name,
      province: $('#fProvince').value.trim(),
      type: $('#fType').value.trim(),
      address: $('#fAddress').value.trim(),
      contact: $('#fContact').value.trim(),
      phone: $('#fPhone').value.trim(),
      social: $('#fSocial').value.trim(),
      status: $('#fStatus').value,
      nextDate: $('#fDate').value,
      evidenceUrl: $('#fEvidenceUrl').value.trim(),
      evidence: $('#fEvidence').value.trim(),
      notes: $('#fNotes').value.trim()
    });

    this.close('formLayer');
    showToast(isEdit ? 'Cliente actualizado' : 'Cliente añadido', client.name);
  }

  handleDeleteCurrent() {
    const id = $('#clientId').value;
    const c = this.store.getById(id);
    if (!c) return;
    if (confirm(`¿Eliminar definitivamente a "${c.name}"?`)) {
      this.store.deleteMany([id]);
      this.close('formLayer');
      showToast('Cliente eliminado', c.name);
    }
  }

  fillTemplate(tplBody, client) {
    const cleanContact = client.contact && !/administraci|@/i.test(client.contact)
      ? client.contact.split('(')[0].trim()
      : 'equipo';
    return tplBody
      .replace(/\{negocio\}/g, client.name || 'su negocio')
      .replace(/\{contacto\}/g, cleanContact)
      .replace(/\{provincia\}/g, client.province || 'Cuba')
      .replace(/\{rubro\}/g, client.type || 'su sector');
  }

  openDetail(id) {
    const c = this.store.getById(id);
    if (!c) return;
    this.activeClientId = id;

    const firstTpl = this.store.templates[0];
    const initialPitch = firstTpl ? this.fillTemplate(firstTpl.body, c) : '';
    const directWa = buildWhatsAppUrl(c.phone);

    $('#detailContent').innerHTML = `
      <div class="detail-head">
        <div class="client-initial">${esc(initials(c.name))}</div>
        <div style="flex:1">
          <h3 style="margin:0 0 3px;font-size:18px">${esc(c.name)}</h3>
          <p style="margin:0;color:var(--muted);font-size:12.5px">
            ${esc(c.type || 'Sin rubro')} · ${esc(c.province || 'Sin provincia')}
            ${c.social ? ` · <b>${esc(c.social)}</b>` : ''}
          </p>
        </div>
        <span class="badge st-${esc(c.status)}">${esc(statusLabel(c.status))}</span>
      </div>

      <div class="detail-section">
        <h4>Datos de contacto y verificación</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <small>Contacto / Persona</small>
            <span>${esc(c.contact || 'No especificado')}</span>
          </div>
          <div class="detail-item">
            <small>Teléfono / WhatsApp</small>
            ${directWa ? `<a href="${esc(directWa)}" target="_blank" rel="noopener"><b>${esc(c.phone)} ↗</b></a>` : `<span>${esc(c.phone || 'Sin teléfono')}</span>`}
          </div>
          <div class="detail-item">
            <small>Ubicación</small>
            <span>${esc(c.address || c.province || 'No registrada')}</span>
          </div>
          <div class="detail-item">
            <small>Publicación / Evidencia</small>
            ${c.evidenceUrl ? `<a href="${esc(c.evidenceUrl)}" target="_blank" rel="noopener">Abrir perfil / post original ↗</a>` : '<span>Sin enlace</span>'}
          </div>
          <div class="detail-item">
            <small>Filtro El Yerro Menú</small>
            <span style="color:#0f7666;font-weight:700">${esc(c.catalogCheck || 'NO está (Verificado)')}</span>
          </div>
          <div class="detail-item">
            <small>Próximo seguimiento</small>
            <span>${c.nextDate ? esc(formatDate(c.nextDate)) : 'Sin fecha asignada'}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Evidencia de por qué necesita catálogo</h4>
        <div class="notes-box">${esc(c.evidence || 'Sin evidencia registrada.')}</div>
      </div>

      <div class="detail-section">
        <h4>Asistente de Propuesta por WhatsApp</h4>
        <div class="wa-composer">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
            <label style="font-size:11.5px;font-weight:800;color:#14532d">Plantilla de mensaje:</label>
            <select id="waTplSelect" style="height:32px;border:1px solid #a7dec0;border-radius:7px;padding:0 8px;font-size:12px;background:#fff">
              ${this.store.templates.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <textarea id="waPitchText">${esc(initialPitch)}</textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary" id="copyPitchBtn" style="padding:7px 11px;font-size:12px">Copiar texto</button>
            <button type="button" class="btn btn-aqua" id="sendWaAndMarkBtn" style="padding:7px 13px;font-size:12px">
              Enviar WhatsApp y marcar Contactado ↗
            </button>
          </div>
        </div>
      </div>

      <div class="detail-section" style="padding-bottom:0">
        <h4>Notas privadas de seguimiento</h4>
        <div class="notes-box">${esc(c.notes || 'Todavía no hay notas privadas.')}</div>
      </div>
    `;

    $('#waTplSelect')?.addEventListener('change', (e) => {
      const tpl = this.store.templates[Number(e.target.value)];
      if (tpl) $('#waPitchText').value = this.fillTemplate(tpl.body, c);
    });

    $('#copyPitchBtn')?.addEventListener('click', async () => {
      await navigator.clipboard?.writeText($('#waPitchText').value);
      showToast('Mensaje copiado', 'Listo para pegar en WhatsApp o Instagram DM.');
    });

    $('#sendWaAndMarkBtn')?.addEventListener('click', () => {
      const text = $('#waPitchText').value.trim();
      const url = buildWhatsAppUrl(c.phone, text);
      if (!url) {
        showToast('Falta teléfono móvil', 'Este prospecto no tiene número válido para WhatsApp.', true);
        return;
      }
      openExternalUrl(url);
      if (c.status === 'Pendiente') {
        this.store.updateStatus(c.id, 'Contactado', 'Propuesta de catálogo enviada por WhatsApp.');
      }
      this.openDetail(c.id);
    });

    $('#detailLayer').classList.add('open');
  }
}
