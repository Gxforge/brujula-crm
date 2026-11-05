import { cryptoId, norm, normalizeStatus, phoneKey } from './utils.js';
import { DEFAULT_SERVICES } from '../data/project-catalog.js';
import { DEFAULT_TEMPLATES, sanitizeClient, sanitizeProject } from './models.js';

const DB_KEY = 'brujula-clientes-v1', LOG_KEY = 'brujula-actividad-v1', TPL_KEY = 'brujula-plantillas-v1', SVC_KEY = 'brujula-servicios-v1';

function promoteToProduction(proj) {
  if (['Aprobado', 'En desarrollo', 'Revisión', 'Entregado'].includes(proj.stage) && !proj.productionStage) proj.productionStage = 'Faltan insumos';
}

class CRMStore {
  constructor() { this.clients = []; this.activities = []; this.templates = [...DEFAULT_TEMPLATES]; this.services = [...DEFAULT_SERVICES]; this.lastSnapshot = null; this.listeners = new Set(); this.load(); }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach((fn) => fn(this)); }
  load() {
    try { const svcs = JSON.parse(localStorage.getItem(SVC_KEY) || 'null'); if (Array.isArray(svcs) && svcs.length) this.services = svcs; } catch { this.services = [...DEFAULT_SERVICES]; }
    try { const raw = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); this.clients = Array.isArray(raw) ? raw.map((c) => sanitizeClient(c, this.services)) : []; } catch { this.clients = []; }
    try { const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); this.activities = Array.isArray(logs) ? logs.slice(0, 70) : []; } catch { this.activities = []; }
    try { const tpls = JSON.parse(localStorage.getItem(TPL_KEY) || 'null'); if (Array.isArray(tpls) && tpls.length) this.templates = tpls; } catch { this.templates = [...DEFAULT_TEMPLATES]; }
  }
  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.clients));
    localStorage.setItem(LOG_KEY, JSON.stringify(this.activities.slice(0, 70)));
    localStorage.setItem(TPL_KEY, JSON.stringify(this.templates));
    localStorage.setItem(SVC_KEY, JSON.stringify(this.services)); this.notify();
  }
  saveSnapshot() { this.lastSnapshot = JSON.stringify(this.clients); }
  undoLast() { if (!this.lastSnapshot) return false; this.clients = JSON.parse(this.lastSnapshot); this.lastSnapshot = null; this.logActivity('Sistema', 'Se restauró el estado anterior'); this.save(); return true; }
  logActivity(subject, action) { this.activities.unshift({ id: cryptoId('log'), subject, action, at: new Date().toISOString() }); if (this.activities.length > 70) this.activities.length = 70; }
  getById(id) { return this.clients.find((c) => c.id === id) || null; }

  upsertOne(data) {
    this.saveSnapshot();
    const existing = data.id ? this.getById(data.id) : null;
    let projects = existing?.projects ? [...existing.projects] : [];
    if (data.primaryProjectTitle !== undefined) {
      const title = String(data.primaryProjectTitle || '').trim();
      if (title) {
        const svc = this.services.find((s) => norm(s.name) === norm(title));
        const first = projects[0];
        const upd = sanitizeProject({ ...first, serviceId: svc?.id || first?.serviceId || '', title, stage: data.projectStage || first?.stage || 'Solicitado', price: data.value ?? first?.price ?? svc?.price ?? 0, paid: data.paid ?? first?.paid ?? 0, currency: data.currency || first?.currency || 'USD', deadline: data.projectDeadline ?? first?.deadline ?? '', notes: data.requirements ?? first?.notes ?? '', checklist: first?.checklist?.length ? first.checklist : (svc?.deliverables || []).map((t) => ({ text: t, done: false })) }, svc);
        promoteToProduction(upd); projects = [upd, ...projects.slice(1)];
      }
    }
    const clean = sanitizeClient({ ...existing, ...data, projects, id: existing?.id || cryptoId(), createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, this.services);
    if (existing) { this.clients = this.clients.map((c) => (c.id === clean.id ? clean : c)); this.logActivity(clean.name, `Ficha actualizada (${clean.desiredProject || clean.status})`); }
    else { this.clients.unshift(clean); this.logActivity(clean.name, `Nuevo cliente${clean.desiredProject ? ' · ' + clean.desiredProject : ''}`); }
    this.save(); return { client: clean, isEdit: Boolean(existing) };
  }

  saveClientProject(clientId, projData) {
    const c = this.getById(clientId); if (!c) return null; this.saveSnapshot();
    const svc = this.services.find((s) => s.id === projData.serviceId || norm(s.name) === norm(projData.title));
    const idx = c.projects.findIndex((p) => p.id === projData.id); const prev = idx >= 0 ? c.projects[idx] : null;
    const proj = sanitizeProject({ ...prev, ...projData, checklist: projData.checklist ?? prev?.checklist ?? (svc?.deliverables || []).map((t) => ({ text: t, done: false })) }, svc);
    promoteToProduction(proj);
    // Auto producción: si pasa a Aprobado/En desarrollo, crear etapa técnica
    if (['Aprobado', 'En desarrollo'].includes(proj.stage) && !proj.productionStage) proj.productionStage = 'Faltan insumos';
    if (proj.stage === 'Entregado') proj.productionStage = 'Publicado';
    const nextProjects = [...c.projects]; if (idx >= 0) nextProjects[idx] = proj; else nextProjects.push(proj);
    if (proj.stage === 'Entregado' && c.status !== 'Convertido') c.status = 'Convertido';
    else if (proj.stage === 'Cotizado' && c.status === 'Pendiente') c.status = 'Propuesta';
    const updated = sanitizeClient({ ...c, projects: nextProjects, updatedAt: new Date().toISOString() }, this.services);
    this.clients = this.clients.map((x) => (x.id === clientId ? updated : x));
    this.logActivity(c.name, `Proyecto "${proj.title}" (${proj.stage}${proj.productionStage ? ' → ' + proj.productionStage : ''})`); this.save(); return proj;
  }

  // M01
  setProductionStage(clientId, projId, stage) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p) return;
    p.productionStage = stage; if (stage === 'Publicado' && p.stage !== 'Entregado') p.stage = 'Entregado';
    c.updatedAt = new Date().toISOString(); this.logActivity(c.name, `Producción: ${p.title} → ${stage}`); this.save();
  }
  // M02
  toggleOnboarding(clientId, projId, idx) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p?.onboarding[idx]) return;
    p.onboarding[idx].done = !p.onboarding[idx].done; c.updatedAt = new Date().toISOString(); this.save();
  }
  // M03
  saveTiers(clientId, projId, tiers) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p) return;
    p.quoteTiers = tiers; c.updatedAt = new Date().toISOString(); this.save();
  }
  // M04
  setRevisions(clientId, projId, patch) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p) return;
    if (patch.included !== undefined) p.revisionsIncluded = Math.max(0, Number(patch.included));
    if (patch.used !== undefined) p.revisionsUsed = Math.max(0, Number(patch.used));
    if (patch.delta) p.revisionsUsed = Math.max(0, p.revisionsUsed + patch.delta);
    c.updatedAt = new Date().toISOString(); this.save();
  }
  // M05
  updateVault(clientId, projId, vaultPatch) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p) return;
    p.vault = { ...p.vault, ...vaultPatch }; c.updatedAt = new Date().toISOString(); this.save();
  }
  // M06
  addHours(clientId, projId, hrs) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p) return;
    p.hoursLogged = Math.max(0, Number(p.hoursLogged || 0) + Number(hrs || 0)); c.updatedAt = new Date().toISOString();
    this.logActivity(c.name, `Horas: ${p.title} +${hrs}h (total ${p.hoursLogged}h)`); this.save();
  }

  removeClientProject(clientId, projId) {
    const c = this.getById(clientId); if (!c) return; this.saveSnapshot();
    const next = c.projects.filter((p) => p.id !== projId);
    const updated = sanitizeClient({ ...c, projects: next, desiredProject: '', value: 0, paid: 0, updatedAt: new Date().toISOString() }, this.services);
    this.clients = this.clients.map((x) => (x.id === clientId ? updated : x)); this.logActivity(c.name, 'Proyecto retirado de la ficha'); this.save();
  }
  toggleProjectChecklist(clientId, projId, itemIdx) {
    const c = this.getById(clientId); const p = c?.projects.find((x) => x.id === projId); if (!p || !p.checklist[itemIdx]) return;
    p.checklist[itemIdx].done = !p.checklist[itemIdx].done; c.updatedAt = new Date().toISOString(); this.save();
  }
  scheduleQuickFollowup(clientId, daysOffset) {
    const c = this.getById(clientId); if (!c) return null; const d = new Date(); d.setDate(d.getDate() + Number(daysOffset || 0));
    c.nextDate = d.toISOString().slice(0, 10); c.updatedAt = new Date().toISOString(); this.logActivity(c.name, `Seguimiento agendado para ${c.nextDate}`); this.save(); return c.nextDate;
  }
  upsertService(svc) {
    const clean = { id: svc.id || cryptoId('svc'), name: String(svc.name || '').trim(), category: String(svc.category || 'Servicio').trim(), price: Math.max(0, Number(svc.price || 0) || 0), currency: String(svc.currency || 'USD').trim(), deliveryDays: Math.max(1, Number(svc.deliveryDays || 3) || 3), summary: String(svc.summary || '').trim(), deliverables: Array.isArray(svc.deliverables) ? svc.deliverables.filter(Boolean) : String(svc.deliverables || '').split('\n').map((s) => s.trim()).filter(Boolean), isRecurring: Boolean(svc.isRecurring) };
    const exists = this.services.some((s) => s.id === clean.id);
    this.services = exists ? this.services.map((s) => (s.id === clean.id ? clean : s)) : [clean, ...this.services];
    this.logActivity('Catálogo', `${exists ? 'Editado' : 'Añadido'} paquete "${clean.name}"`); this.save(); return clean;
  }
  deleteService(id) { this.services = this.services.filter((s) => s.id !== id); this.save(); }
  updateStatus(id, status, extraNote = '') {
    const c = this.getById(id); if (!c) return null; c.status = normalizeStatus(status); c.updatedAt = new Date().toISOString();
    if (extraNote) { const stamp = new Date().toLocaleDateString('es-ES'); c.notes = c.notes ? `${c.notes}\n[${stamp}] ${extraNote}` : `[${stamp}] ${extraNote}`; }
    this.logActivity(c.name, `Estado cambiado a ${c.status}`); this.save(); return c;
  }
  bulkUpdateStatus(ids, status) {
    this.saveSnapshot(); const set = new Set(ids); let count = 0;
    this.clients.forEach((c) => { if (set.has(c.id)) { c.status = normalizeStatus(status); c.updatedAt = new Date().toISOString(); count++; } });
    if (count) { this.logActivity(`${count} clientes`, `Movidos en lote a ${status}`); this.save(); } return count;
  }
  deleteMany(ids) {
    this.saveSnapshot(); const set = new Set(ids); const before = this.clients.length;
    this.clients = this.clients.filter((c) => !set.has(c.id)); const removed = before - this.clients.length;
    if (removed) { this.logActivity(`${removed} registro(s)`, 'Eliminados de la base'); this.save(); } return removed;
  }
  importBatch(records, sourceLabel = 'Tabla importada') {
    this.saveSnapshot(); let added = 0, updated = 0;
    records.forEach((raw) => {
      const incoming = sanitizeClient(raw, this.services); if (!incoming.name) return;
      const inPhone = phoneKey(incoming.phone);
      const match = this.clients.find((c) => { const cPhone = phoneKey(c.phone); return (inPhone && cPhone && inPhone === cPhone) || (norm(c.name) === norm(incoming.name) && norm(c.province) === norm(incoming.province)); });
      if (match) { Object.assign(match, sanitizeClient({ ...incoming, id: match.id, status: match.status !== 'Pendiente' ? match.status : incoming.status, projects: match.projects?.length ? match.projects : incoming.projects, notes: match.notes || incoming.notes, nextDate: match.nextDate || incoming.nextDate, createdAt: match.createdAt }, this.services)); updated++; }
      else { this.clients.push(incoming); added++; }
    }); this.logActivity(sourceLabel, `${added} añadidos · ${updated} actualizados`); this.save(); return { added, updated };
  }
  clearAll() { this.saveSnapshot(); this.clients = []; this.logActivity('Base de datos', 'Se vaciaron todos los registros'); this.save(); }
}
export const store = new CRMStore();
