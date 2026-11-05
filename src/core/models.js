import { cryptoId, norm, normalizeStatus } from './utils.js';
import { ONBOARDING_TEMPLATE, DEFAULT_REVISIONS_INCLUDED, defaultTiersFromService } from '../data/production.js';

export const DEFAULT_TEMPLATES = [
  { id: 'primer_contacto', name: '1er Contacto · Propuesta de Catálogo', body: '¡Hola {contacto}! Vi su negocio *{negocio}* en {provincia} ({rubro}) y me encantó lo que ofrecen. Noté que aún reciben pedidos directos por chat sin un catálogo digital interactivo. Diseño catálogos rápidos donde sus clientes eligen productos y el pedido llega listo a su WhatsApp. ¿Les gustaría ver una muestra sin compromiso?' },
  { id: 'envio_demo', name: 'Envío de Demo / Muestra', body: '¡Hola {contacto}! Preparé una vista previa de cómo se vería *{proyecto}* para *{negocio}* con sus productos organizados y pedido directo al WhatsApp. ¿Le comparto el enlace para que lo pruebe desde el móvil?' },
  { id: 'seguimiento', name: 'Seguimiento cordial', body: '¡Hola {contacto}! Paso por aquí rápido para saber si pudieron revisar la propuesta de *{proyecto}* para *{negocio}*. Esta semana tengo cupo para dejarlo configurado con sus fotos y precios. ¡Quedo atento!' },
  { id: 'cobro_saldo', name: 'Entrega / Recordatorio de Saldo', body: '¡Hola {contacto}! Ya tenemos listo el avance de *{proyecto}* para *{negocio}*. Queda un saldo pendiente de *{saldo}* para dejarlo publicado y entregado al 100 %. ¿Coordinamos por aquí?' }
];

function sanitizeTiers(raw, svc, cur) {
  if (Array.isArray(raw) && raw.length === 3) {
    return raw.map((t) => ({
      id: String(t.id || cryptoId('tier')), name: String(t.name || 'Opción').trim(),
      price: Math.max(0, Number(t.price || 0)), currency: String(t.currency || cur || 'USD').trim(),
      days: Math.max(1, Number(t.days || 3)), includes: Array.isArray(t.includes) ? t.includes.map((x) => String(x).trim()).filter(Boolean) : [],
      pitch: String(t.pitch || '').trim()
    }));
  }
  return defaultTiersFromService(svc || { price: 60, currency: cur, deliveryDays: 4, deliverables: [] }, cur);
}

export function sanitizeProject(p = {}, svcHint = null) {
  const prodStage = String(p.productionStage || '').trim();
  const validProd = ['Faltan insumos', 'En diseño', 'Revisión del dueño', 'Publicado'];
  const stage = String(p.stage || 'Solicitado').trim();
  const needsProd = ['Aprobado', 'En desarrollo', 'Revisión', 'Entregado'].includes(stage);
  return {
    id: p.id || cryptoId('prj'),
    serviceId: String(p.serviceId || svcHint?.id || '').trim(),
    title: String(p.title || '').trim() || 'Proyecto digital',
    stage,
    productionStage: validProd.includes(prodStage) ? prodStage : (needsProd ? 'Faltan insumos' : ''),
    price: Math.max(0, Number(p.price || 0) || 0),
    paid: Math.max(0, Number(p.paid || 0) || 0),
    currency: String(p.currency || svcHint?.currency || 'USD').trim(),
    deadline: String(p.deadline || '').trim(),
    notes: String(p.notes || '').trim(),
    checklist: Array.isArray(p.checklist) ? p.checklist.map((it) => ({ text: String(it.text || '').trim(), done: Boolean(it.done) })).filter((it) => it.text) : [],
    onboarding: Array.isArray(p.onboarding) && p.onboarding.length
      ? p.onboarding.map((it) => ({ text: String(it.text || '').trim(), done: Boolean(it.done) })).filter((it) => it.text)
      : ONBOARDING_TEMPLATE.map((t) => ({ text: t, done: false })),
    quoteTiers: sanitizeTiers(p.quoteTiers, svcHint, p.currency),
    revisionsIncluded: Math.max(0, Number(p.revisionsIncluded ?? DEFAULT_REVISIONS_INCLUDED)),
    revisionsUsed: Math.max(0, Number(p.revisionsUsed || 0)),
    hoursLogged: Math.max(0, Number(p.hoursLogged || 0)),
    vault: {
      url: String(p.vault?.url || p.publicUrl || '').trim(),
      domain: String(p.vault?.domain || '').trim(),
      hosting: String(p.vault?.hosting || '').trim(),
      repo: String(p.vault?.repo || '').trim(),
      expiresAt: String(p.vault?.expiresAt || '').trim(),
      notes: String(p.vault?.notes || '').trim()
    },
    createdAt: p.createdAt || new Date().toISOString()
  };
}

export function sanitizeClient(raw = {}, services = []) {
  const now = new Date().toISOString();
  let projects = Array.isArray(raw.projects) ? raw.projects.map((pr) => {
    const svc = services.find((s) => s.id === pr.serviceId || norm(s.name) === norm(pr.title));
    return sanitizeProject(pr, svc);
  }) : [];
  const desired = String(raw.desiredProject || '').trim();
  const rawStage = String(raw.projectStage || '').trim();
  if (!projects.length && desired) {
    const svc = services.find((s) => norm(s.name) === norm(desired));
    projects = [sanitizeProject({ serviceId: svc?.id || '', title: desired, stage: rawStage && rawStage !== 'Sin proyecto' ? rawStage : 'Solicitado', price: Number(raw.value || svc?.price || 0), paid: Number(raw.paid || 0), currency: raw.currency || svc?.currency || 'USD', deadline: raw.projectDeadline || '', notes: raw.requirements || '', checklist: (svc?.deliverables || []).map((t) => ({ text: t, done: false })) }, svc)];
  }
  const primary = projects[0];
  const totalPrice = projects.length ? projects.reduce((s, p) => s + p.price, 0) : (Number(raw.value || 0) || 0);
  const totalPaid = projects.length ? projects.reduce((s, p) => s + p.paid, 0) : (Number(raw.paid || 0) || 0);
  return {
    id: raw.id || cryptoId(), name: String(raw.name || '').trim(), province: String(raw.province || '').trim(),
    address: String(raw.address || '').trim(), type: String(raw.type || '').trim(),
    contact: String(raw.contact || '').trim(), phone: String(raw.phone || '').trim(), social: String(raw.social || '').trim(),
    status: normalizeStatus(raw.status),
    desiredProject: projects.length ? projects.map((p) => p.title).join(' + ') : desired,
    projectStage: primary ? primary.stage : (rawStage || 'Sin proyecto'),
    currency: primary ? primary.currency : String(raw.currency || 'USD').trim(),
    value: totalPrice, paid: totalPaid,
    projectDeadline: primary ? primary.deadline : String(raw.projectDeadline || '').trim(),
    requirements: primary?.notes || String(raw.requirements || '').trim(),
    projects, nextDate: String(raw.nextDate || '').trim(),
    evidenceUrl: String(raw.evidenceUrl || '').trim(), evidence: String(raw.evidence || '').trim(),
    catalogCheck: String(raw.catalogCheck || 'NO está (Verificado)').trim(),
    notes: String(raw.notes || '').trim(), createdAt: raw.createdAt || now, updatedAt: raw.updatedAt || now
  };
}
