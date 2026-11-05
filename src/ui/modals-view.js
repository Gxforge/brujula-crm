import { $, CUBA_PROVINCES, STAGES, esc, norm, showToast } from '../core/utils.js';
import { CURRENCIES, PROJECT_STAGES } from '../data/project-catalog.js';
import { renderClientDetailModal } from './detail-modal.js';
import { appState } from '../core/app-state.js';

export class ModalsView {
  constructor(store) { this.store = store; this.activeClientId = null; this.populateStaticOptions(); this.bindEvents(); }
  populateStaticOptions() {
    if ($('#provinceDatalist')) $('#provinceDatalist').innerHTML = CUBA_PROVINCES.map((p) => `<option value="${esc(p)}"></option>`).join('');
    if ($('#fStatus')) $('#fStatus').innerHTML = STAGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    if ($('#fProjStage')) $('#fProjStage').innerHTML = PROJECT_STAGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('');
    if ($('#fCurrency')) $('#fCurrency').innerHTML = CURRENCIES.map((c) => `<option>${c}</option>`).join('');
    if ($('#svcCurrency')) $('#svcCurrency').innerHTML = CURRENCIES.map((c) => `<option>${c}</option>`).join('');
  }
  refreshProjectDatalist() {
    if ($('#projectDatalist')) $('#projectDatalist').innerHTML = this.store.services.map((s) => `<option value="${esc(s.name)}"></option>`).join('');
    const sel = $('#fExistingClientPick'); if (sel) sel.innerHTML = `<option value="">-- Nuevo cliente --</option>` + this.store.clients.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.province || 'Cuba')})</option>`).join('');
    const ref = $('#fReferred'); if (ref) { const cur = ref.value; ref.innerHTML = `<option value="">— Ninguno —</option>` + this.store.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === cur ? 'selected' : ''}>${esc(c.name)}</option>`).join(''); }
    const ass = $('#fAssigned'); if (ass) { const cur = ass.value; ass.innerHTML = `<option value="">— Sin asignar —</option>` + (appState.team || []).map((m) => `<option value="${esc(m.id)}" ${m.id === cur ? 'selected' : ''}>${esc(m.name)} (${m.commissionPct}%)</option>`).join(''); }
  }
  bindEvents() {
    document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => this.close(btn.dataset.close)));
    document.querySelectorAll('.modal-layer').forEach((layer) => layer.addEventListener('click', (e) => { if (e.target === layer) this.close(layer.id); }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-layer.open').forEach((l) => this.close(l.id)); });
    $('#fDesiredProject')?.addEventListener('change', (e) => { const svc = this.store.services.find((s) => norm(s.name) === norm(e.target.value)); if (svc && !Number($('#fValue').value)) { $('#fValue').value = svc.price; $('#fCurrency').value = svc.currency; if ($('#fProjStage').value === 'Sin proyecto') $('#fProjStage').value = 'Solicitado'; } });
    $('#fExistingClientPick')?.addEventListener('change', (e) => { const c = this.store.getById(e.target.value); if (c) { const kp = $('#fDesiredProject').value, kv = $('#fValue').value, kc = $('#fCurrency').value; this.fillClientFields(c); if (kp) { $('#fDesiredProject').value = kp; $('#fValue').value = kv; $('#fCurrency').value = kc; $('#fProjStage').value = 'Solicitado'; } } });
    $('#clientForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    $('#deleteClientBtn')?.addEventListener('click', () => this.handleDeleteCurrent());
    $('#serviceForm')?.addEventListener('submit', (e) => this.handleServiceSubmit(e));
    $('#deleteServiceBtn')?.addEventListener('click', () => this.handleDeleteService());
    $('#editFromDetailBtn')?.addEventListener('click', () => { const c = this.store.getById(this.activeClientId); this.close('detailLayer'); if (c) this.openForm(c); });
  }
  close(layerId) { document.getElementById(layerId)?.classList.remove('open'); }
  fillClientFields(client) {
    const fp = client?.projects?.[0];
    $('#clientId').value = client?.id || ''; $('#fName').value = client?.name || ''; $('#fProvince').value = client?.province || ''; $('#fType').value = client?.type || ''; $('#fAddress').value = client?.address || ''; $('#fContact').value = client?.contact || ''; $('#fPhone').value = client?.phone || ''; $('#fSocial').value = client?.social || 'Facebook'; $('#fStatus').value = client?.status || 'Pendiente'; $('#fDate').value = client?.nextDate || ''; $('#fDesiredProject').value = fp?.title || client?.desiredProject || ''; $('#fProjStage').value = fp?.stage || client?.projectStage || 'Sin proyecto'; $('#fValue').value = fp?.price ?? client?.value ?? ''; $('#fPaid').value = fp?.paid ?? client?.paid ?? ''; $('#fCurrency').value = fp?.currency || client?.currency || 'USD'; $('#fDeadline').value = fp?.deadline || client?.projectDeadline || ''; $('#fRequirements').value = fp?.notes || client?.requirements || ''; $('#fEvidenceUrl').value = client?.evidenceUrl || ''; $('#fEvidence').value = client?.evidence || ''; $('#fNotes').value = client?.notes || ''; if ($('#fReferred')) $('#fReferred').value = client?.referredBy || ''; if ($('#fAssigned')) $('#fAssigned').value = client?.assignedTo || '';
  }
  openForm(client = null, presetService = null) {
    this.refreshProjectDatalist(); $('#formTitle').textContent = client ? 'Editar cliente' : (presetService ? `Asignar "${presetService.name}"` : 'Añadir cliente'); $('#existingPickRow').style.display = !client && presetService && this.store.clients.length ? 'block' : 'none'; this.fillClientFields(client);
    if (presetService && !client) { $('#fDesiredProject').value = presetService.name; $('#fProjStage').value = 'Solicitado'; $('#fValue').value = presetService.price; $('#fCurrency').value = presetService.currency; }
    $('#deleteClientBtn').style.display = client ? 'inline-flex' : 'none'; $('#formLayer').classList.add('open'); setTimeout(() => $('#fName')?.focus(), 80);
  }
  handleFormSubmit(e) {
    e.preventDefault(); const name = $('#fName').value.trim(); if (!name) return showToast('Nombre obligatorio', '', true);
    const projTitle = $('#fDesiredProject').value.trim(); const existingId = $('#clientId').value || undefined; const existing = existingId ? this.store.getById(existingId) : null;
    if (existing && $('#existingPickRow').style.display === 'block' && projTitle) {
      this.store.saveClientProject(existing.id, { title: projTitle, stage: $('#fProjStage').value === 'Sin proyecto' ? 'Solicitado' : $('#fProjStage').value, price: Number($('#fValue').value || 0), paid: Number($('#fPaid').value || 0), currency: $('#fCurrency').value, deadline: $('#fDeadline').value, notes: $('#fRequirements').value.trim() });
      this.close('formLayer'); return showToast('Proyecto añadido', `${existing.name} · ${projTitle}`);
    }
    const { client, isEdit } = this.store.upsertOne({
      id: existingId, name, province: $('#fProvince').value.trim(), type: $('#fType').value.trim(), address: $('#fAddress').value.trim(), contact: $('#fContact').value.trim(), phone: $('#fPhone').value.trim(), social: $('#fSocial').value.trim(), status: $('#fStatus').value, nextDate: $('#fDate').value, primaryProjectTitle: projTitle, projectStage: projTitle && $('#fProjStage').value === 'Sin proyecto' ? 'Solicitado' : $('#fProjStage').value, value: Number($('#fValue').value || 0), paid: Number($('#fPaid').value || 0), currency: $('#fCurrency').value, projectDeadline: $('#fDeadline').value, requirements: $('#fRequirements').value.trim(), evidenceUrl: $('#fEvidenceUrl').value.trim(), evidence: $('#fEvidence').value.trim(), notes: $('#fNotes').value.trim(), referredBy: $('#fReferred')?.value || '', assignedTo: $('#fAssigned')?.value || ''
    });
    this.close('formLayer'); showToast(isEdit ? 'Actualizado' : 'Registrado', client.name);
  }
  handleDeleteCurrent() { const id = $('#clientId').value; const c = this.store.getById(id); if (c && confirm(`¿Eliminar "${c.name}"?`)) { this.store.deleteMany([id]); this.close('formLayer'); showToast('Eliminado', c.name); } }
  openServiceForm(svc = null) {
    $('#svcFormTitle').textContent = svc ? 'Editar paquete' : 'Nuevo paquete'; $('#svcId').value = svc?.id || ''; $('#svcName').value = svc?.name || ''; $('#svcCategory').value = svc?.category || 'Catálogos'; $('#svcPrice').value = svc?.price ?? 80; $('#svcCurrency').value = svc?.currency || 'USD'; $('#svcDays').value = svc?.deliveryDays ?? 5; $('#svcSummary').value = svc?.summary || ''; $('#svcDeliverables').value = (svc?.deliverables || []).join('\n'); $('#svcRecurring').checked = Boolean(svc?.isRecurring); $('#deleteServiceBtn').style.display = svc ? 'inline-flex' : 'none'; $('#serviceLayer').classList.add('open');
  }
  handleServiceSubmit(e) {
    e.preventDefault(); const name = $('#svcName').value.trim(); if (!name) return;
    this.store.upsertService({ id: $('#svcId').value || undefined, name, category: $('#svcCategory').value.trim(), price: Number($('#svcPrice').value || 0), currency: $('#svcCurrency').value, deliveryDays: Number($('#svcDays').value || 3), summary: $('#svcSummary').value.trim(), deliverables: $('#svcDeliverables').value, isRecurring: $('#svcRecurring').checked });
    this.close('serviceLayer'); showToast('Catálogo actualizado', name);
  }
  handleDeleteService() { const id = $('#svcId').value; if (id && confirm('¿Quitar paquete?')) { this.store.deleteService(id); this.close('serviceLayer'); showToast('Paquete eliminado'); } }
  openDetail(id) { this.activeClientId = id; renderClientDetailModal(this.store, id, (cid) => this.openDetail(cid)); $('#detailLayer').classList.add('open'); }
}
