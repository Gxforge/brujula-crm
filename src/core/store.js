import { cryptoId, norm, normalizeStatus, phoneKey } from './utils.js';

const DB_KEY = 'brujula-clientes-v1';
const LOG_KEY = 'brujula-actividad-v1';
const TPL_KEY = 'brujula-plantillas-v1';

export const DEFAULT_TEMPLATES = [
  {
    id: 'primer_contacto',
    name: '1er Contacto · Propuesta de Catálogo',
    body: '¡Hola {contacto}! Vi su negocio *{negocio}* en {provincia} ({rubro}) y me encantó lo que ofrecen. Noté que aún reciben pedidos directos por chat sin un catálogo digital interactivo. Diseño catálogos rápidos donde sus clientes eligen productos y el pedido llega listo a su WhatsApp. ¿Les gustaría ver una muestra sin compromiso?'
  },
  {
    id: 'envio_demo',
    name: 'Envío de Demo / Muestra',
    body: '¡Hola {contacto}! Preparé una vista previa de cómo se vería el catálogo digital de *{negocio}* con sus productos organizados y carrito directo al WhatsApp. ¿Le comparto el enlace para que lo pruebe desde el móvil?'
  },
  {
    id: 'seguimiento',
    name: 'Seguimiento cordial',
    body: '¡Hola {contacto}! Paso por aquí rápido para saber si pudieron revisar la propuesta del catálogo digital para *{negocio}*. Esta semana tengo cupo para dejarlo configurado con sus fotos y precios. ¡Quedo atento!'
  }
];

class CRMStore {
  constructor() {
    this.clients = [];
    this.activities = [];
    this.templates = [...DEFAULT_TEMPLATES];
    this.lastSnapshot = null;
    this.listeners = new Set();
    this.load();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn(this));
  }

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
      this.clients = Array.isArray(raw) ? raw.map((c) => this.sanitizeClient(c)) : [];
    } catch {
      this.clients = [];
    }
    try {
      const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      this.activities = Array.isArray(logs) ? logs.slice(0, 60) : [];
    } catch {
      this.activities = [];
    }
    try {
      const tpls = JSON.parse(localStorage.getItem(TPL_KEY) || 'null');
      if (Array.isArray(tpls) && tpls.length) this.templates = tpls;
    } catch {
      this.templates = [...DEFAULT_TEMPLATES];
    }
  }

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.clients));
    localStorage.setItem(LOG_KEY, JSON.stringify(this.activities.slice(0, 60)));
    localStorage.setItem(TPL_KEY, JSON.stringify(this.templates));
    this.notify();
  }

  saveSnapshot() {
    this.lastSnapshot = JSON.stringify(this.clients);
  }

  undoLast() {
    if (!this.lastSnapshot) return false;
    this.clients = JSON.parse(this.lastSnapshot);
    this.lastSnapshot = null;
    this.logActivity('Sistema', 'Se restauró el estado anterior');
    this.save();
    return true;
  }

  sanitizeClient(raw) {
    const now = new Date().toISOString();
    return {
      id: raw.id || cryptoId(),
      name: String(raw.name || '').trim(),
      province: String(raw.province || '').trim(),
      address: String(raw.address || '').trim(),
      type: String(raw.type || '').trim(),
      contact: String(raw.contact || '').trim(),
      phone: String(raw.phone || '').trim(),
      social: String(raw.social || '').trim(),
      status: normalizeStatus(raw.status),
      value: Number(raw.value || 0) || 0,
      nextDate: String(raw.nextDate || '').trim(),
      evidenceUrl: String(raw.evidenceUrl || '').trim(),
      evidence: String(raw.evidence || '').trim(),
      catalogCheck: String(raw.catalogCheck || 'NO está (Verificado)').trim(),
      notes: String(raw.notes || '').trim(),
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || now
    };
  }

  logActivity(subject, action) {
    this.activities.unshift({
      id: cryptoId('log'),
      subject,
      action,
      at: new Date().toISOString()
    });
    if (this.activities.length > 60) this.activities.length = 60;
  }

  getById(id) {
    return this.clients.find((c) => c.id === id) || null;
  }

  upsertOne(data) {
    this.saveSnapshot();
    const existing = data.id ? this.getById(data.id) : null;
    const clean = this.sanitizeClient({
      ...existing,
      ...data,
      id: existing?.id || cryptoId(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (existing) {
      this.clients = this.clients.map((c) => (c.id === clean.id ? clean : c));
      this.logActivity(clean.name, `Ficha actualizada (${clean.status})`);
    } else {
      this.clients.unshift(clean);
      this.logActivity(clean.name, 'Nuevo cliente añadido');
    }
    this.save();
    return { client: clean, isEdit: Boolean(existing) };
  }

  updateStatus(id, status, extraNote = '') {
    const c = this.getById(id);
    if (!c) return null;
    c.status = normalizeStatus(status);
    c.updatedAt = new Date().toISOString();
    if (extraNote) {
      const stamp = new Date().toLocaleDateString('es-ES');
      c.notes = c.notes ? `${c.notes}\n[${stamp}] ${extraNote}` : `[${stamp}] ${extraNote}`;
    }
    this.logActivity(c.name, `Estado cambiado a ${c.status}`);
    this.save();
    return c;
  }

  bulkUpdateStatus(ids, status) {
    this.saveSnapshot();
    const set = new Set(ids);
    let count = 0;
    this.clients.forEach((c) => {
      if (set.has(c.id)) {
        c.status = normalizeStatus(status);
        c.updatedAt = new Date().toISOString();
        count++;
      }
    });
    if (count) {
      this.logActivity(`${count} clientes`, `Movidos en lote a ${status}`);
      this.save();
    }
    return count;
  }

  deleteMany(ids) {
    this.saveSnapshot();
    const set = new Set(ids);
    const before = this.clients.length;
    this.clients = this.clients.filter((c) => !set.has(c.id));
    const removed = before - this.clients.length;
    if (removed) {
      this.logActivity(`${removed} registro(s)`, 'Eliminados de la base');
      this.save();
    }
    return removed;
  }

  importBatch(records, sourceLabel = 'Tabla importada') {
    this.saveSnapshot();
    let added = 0;
    let updated = 0;
    records.forEach((raw) => {
      const incoming = this.sanitizeClient(raw);
      if (!incoming.name) return;
      const inPhone = phoneKey(incoming.phone);
      const match = this.clients.find((c) => {
        const cPhone = phoneKey(c.phone);
        if (inPhone && cPhone && inPhone === cPhone) return true;
        return norm(c.name) === norm(incoming.name) && norm(c.province) === norm(incoming.province);
      });
      if (match) {
        Object.assign(match, {
          ...incoming,
          id: match.id,
          status: match.status !== 'Pendiente' ? match.status : incoming.status,
          notes: match.notes || incoming.notes,
          value: match.value || incoming.value,
          nextDate: match.nextDate || incoming.nextDate,
          createdAt: match.createdAt,
          updatedAt: new Date().toISOString()
        });
        updated++;
      } else {
        this.clients.push(incoming);
        added++;
      }
    });
    this.logActivity(sourceLabel, `${added} añadidos · ${updated} actualizados`);
    this.save();
    return { added, updated };
  }

  clearAll() {
    this.saveSnapshot();
    this.clients = [];
    this.logActivity('Base de datos', 'Se vaciaron todos los registros');
    this.save();
  }
}

export const store = new CRMStore();
