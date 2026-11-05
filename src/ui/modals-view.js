import { $, CUBA_PROVINCES, STAGES, esc, norm, showToast } from '../core/utils.js';
import { CURRENCIES, PROJECT_STAGES } from '../data/project-catalog.js';
import { renderClientDetailModal } from './detail-modal.js';

export class ModalsView {
  constructor(store) {
    this.store = store;
    this.activeClientId = null;
    this.populateStaticOptions();
    this.bindEvents();
  }

  populateStaticOptions() {
    if ($('#provinceDatalist')) {
      $('#provinceDatalist').innerHTML = CUBA_PROVINCES.map((p) => `<option value="${esc(p)}"></option>`).join('');
    }
    if ($('#fStatus')) {
      $('#fStatus').innerHTML = STAGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    }
    if ($('#fProjStage')) {
      $('#fProjStage').innerHTML = PROJECT_STAGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    }
    if ($('#fCurrency')) {
      $('#fCurrency').innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join('');
    }
    if ($('#svcCurrency')) {
      $('#svcCurrency').innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join('');
    }
  }

  refreshProjectDatalist() {
    if ($('#projectDatalist')) {
      $('#projectDatalist').innerHTML = this.store.services.map((s) => `<option value="${esc(s.name)}"></option>`).join('');
    }
    const existingSel = $('#fExistingClientPick');
    if (existingSel) {
      existingSel.innerHTML = `<option value="">-- Nuevo cliente (llenar abajo) --</option>` +
        this.store.clients.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.province || 'Cuba')})</option>`).join('');
    }
  }

  bindEvents() {
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close(btn.dataset.close));
    });

    document.querySelectorAll('.modal-layer').forEach((layer) => {
      layer.addEventListener('click', (e) => { if (e.target === layer) this.close(layer.id); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal-layer.open').forEach((l) => this.close(l.id));
    });

    $('#fDesiredProject')?.addEventListener('change', (e) => {
      const svc = this.store.services.find((s) => norm(s.name) === norm(e.target.value));
      if (svc && !Number($('#fValue').value)) {
        $('#fValue').value = svc.price;
        $('#fCurrency').value = svc.currency;
        if ($('#fProjStage').value === 'Sin proyecto') $('#fProjStage').value = 'Solicitado';
      }
    });

    $('#fExistingClientPick')?.addEventListener('change', (e) => {
      const c = this.store.getById(e.target.value);
      if (c) {
        const keepProj = $('#fDesiredProject').value;
        const keepVal = $('#fValue').value;
        const keepCur = $('#fCurrency').value;
        this.fillClientFields(c);
        if (keepProj) {
          $('#fDesiredProject').value = keepProj;
          $('#fValue').value = keepVal;
          $('#fCurrency').value = keepCur;
          $('#fProjStage').value = 'Solicitado';
        }
      }
    });

    $('#clientForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    $('#deleteClientBtn')?.addEventListener('click', () => this.handleDeleteCurrent());
    $('#serviceForm')?.addEventListener('submit', (e) => this.handleServiceSubmit(e));
    $('#deleteServiceBtn')?.addEventListener('click', () => this.handleDeleteService());

    $('#editFromDetailBtn')?.addEventListener('click', () => {
      const c = this.store.getById(this.activeClientId);
      this.close('detailLayer');
      if (c) this.openForm(c);
    });
  }

  close(layerId) {
    document.getElementById(layerId)?.classList.remove('open');
  }

  fillClientFields(client) {
    const firstProj = client?.projects?.[0];
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
    $('#fDesiredProject').value = firstProj?.title || client?.desiredProject || '';
    $('#fProjStage').value = firstProj?.stage || client?.projectStage || 'Sin proyecto';
    $('#fValue').value = firstProj?.price ?? client?.value ?? '';
    $('#fPaid').value = firstProj?.paid ?? client?.paid ?? '';
    $('#fCurrency').value = firstProj?.currency || client?.currency || 'USD';
    $('#fDeadline').value = firstProj?.deadline || client?.projectDeadline || '';
    $('#fRequirements').value = firstProj?.notes || client?.requirements || '';
    $('#fEvidenceUrl').value = client?.evidenceUrl || '';
    $('#fEvidence').value = client?.evidence || '';
    $('#fNotes').value = client?.notes || '';
  }

  openForm(client = null, presetService = null) {
    this.refreshProjectDatalist();
    $('#formTitle').textContent = client ? 'Editar cliente y proyecto' : (presetService ? `Asignar "${presetService.name}"` : 'Añadir nuevo cliente');
    $('#existingPickRow').style.display = !client && presetService && this.store.clients.length ? 'block' : 'none';
    this.fillClientFields(client);

    if (presetService && !client) {
      $('#fDesiredProject').value = presetService.name;
      $('#fProjStage').value = 'Solicitado';
      $('#fValue').value = presetService.price;
      $('#fCurrency').value = presetService.currency;
    }

    $('#deleteClientBtn').style.display = client ? 'inline-flex' : 'none';
    $('#formLayer').classList.add('open');
    setTimeout(() => $('#fName')?.focus(), 80);
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const name = $('#fName').value.trim();
    if (!name) return showToast('Nombre obligatorio', 'Escribe el nombre del negocio.', true);

    const projTitle = $('#fDesiredProject').value.trim();
    const existingId = $('#clientId').value || undefined;
    const existing = existingId ? this.store.getById(existingId) : null;

    // Si eligió un cliente existente desde el catálogo y ya tenía otro proyecto, añade el nuevo proyecto a su lista
    if (existing && $('#existingPickRow').style.display === 'block' && projTitle) {
      this.store.saveClientProject(existing.id, {
        title: projTitle,
        stage: $('#fProjStage').value === 'Sin proyecto' ? 'Solicitado' : $('#fProjStage').value,
        price: Number($('#fValue').value || 0),
        paid: Number($('#fPaid').value || 0),
        currency: $('#fCurrency').value,
        deadline: $('#fDeadline').value,
        notes: $('#fRequirements').value.trim()
      });
      this.close('formLayer');
      return showToast('Proyecto añadido al cliente', `${existing.name} · ${projTitle}`);
    }

    const { client, isEdit } = this.store.upsertOne({
      id: existingId,
      name,
      province: $('#fProvince').value.trim(),
      type: $('#fType').value.trim(),
      address: $('#fAddress').value.trim(),
      contact: $('#fContact').value.trim(),
      phone: $('#fPhone').value.trim(),
      social: $('#fSocial').value.trim(),
      status: $('#fStatus').value,
      nextDate: $('#fDate').value,
      primaryProjectTitle: projTitle,
      projectStage: projTitle && $('#fProjStage').value === 'Sin proyecto' ? 'Solicitado' : $('#fProjStage').value,
      value: Number($('#fValue').value || 0),
      paid: Number($('#fPaid').value || 0),
      currency: $('#fCurrency').value,
      projectDeadline: $('#fDeadline').value,
      requirements: $('#fRequirements').value.trim(),
      evidenceUrl: $('#fEvidenceUrl').value.trim(),
      evidence: $('#fEvidence').value.trim(),
      notes: $('#fNotes').value.trim()
    });

    this.close('formLayer');
    showToast(isEdit ? 'Cliente actualizado' : 'Cliente registrado', client.name);
  }

  handleDeleteCurrent() {
    const id = $('#clientId').value;
    const c = this.store.getById(id);
    if (c && confirm(`¿Eliminar definitivamente a "${c.name}"?`)) {
      this.store.deleteMany([id]);
      this.close('formLayer');
      showToast('Cliente eliminado', c.name);
    }
  }

  openServiceForm(svc = null) {
    $('#svcFormTitle').textContent = svc ? 'Editar paquete del catálogo' : 'Nuevo paquete / tipo de proyecto';
    $('#svcId').value = svc?.id || '';
    $('#svcName').value = svc?.name || '';
    $('#svcCategory').value = svc?.category || 'Catálogos';
    $('#svcPrice').value = svc?.price ?? 80;
    $('#svcCurrency').value = svc?.currency || 'USD';
    $('#svcDays').value = svc?.deliveryDays ?? 5;
    $('#svcSummary').value = svc?.summary || '';
    $('#svcDeliverables').value = (svc?.deliverables || []).join('\n');
    $('#deleteServiceBtn').style.display = svc ? 'inline-flex' : 'none';
    $('#serviceLayer').classList.add('open');
  }

  handleServiceSubmit(e) {
    e.preventDefault();
    const name = $('#svcName').value.trim();
    if (!name) return;
    this.store.upsertService({
      id: $('#svcId').value || undefined,
      name,
      category: $('#svcCategory').value.trim(),
      price: Number($('#svcPrice').value || 0),
      currency: $('#svcCurrency').value,
      deliveryDays: Number($('#svcDays').value || 3),
      summary: $('#svcSummary').value.trim(),
      deliverables: $('#svcDeliverables').value
    });
    this.close('serviceLayer');
    showToast('Catálogo actualizado', name);
  }

  handleDeleteService() {
    const id = $('#svcId').value;
    if (id && confirm('¿Quitar este paquete del catálogo de servicios?')) {
      this.store.deleteService(id);
      this.close('serviceLayer');
      showToast('Paquete eliminado');
    }
  }

  openDetail(id) {
    this.activeClientId = id;
    renderClientDetailModal(this.store, id, (cid) => this.openDetail(cid));
    $('#detailLayer').classList.add('open');
  }
}
