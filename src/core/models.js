import { cryptoId, norm, normalizeStatus } from './utils.js';
import { ONBOARDING_TEMPLATE, DEFAULT_REVISIONS_INCLUDED, defaultTiersFromService } from '../data/production.js';

export const DEFAULT_TEMPLATES = [
  { id: 'primer_contacto', name: '1er Contacto · Propuesta de Catálogo', body: '¡Hola {contacto}! Vi su negocio *{negocio}* en {provincia} ({rubro}) y me encantó lo que ofrecen. Noté que aún reciben pedidos directos por chat sin un catálogo digital interactivo. Diseño catálogos rápidos donde sus clientes eligen productos y el pedido llega listo a su WhatsApp. ¿Les gustaría ver una muestra sin compromiso?' },
  { id: 'envio_demo', name: 'Envío de Demo / Muestra', body: '¡Hola {contacto}! Preparé una vista previa de cómo se vería *{proyecto}* para *{negocio}* con sus productos organizados y pedido directo al WhatsApp. ¿Le comparto el enlace para que lo pruebe desde el móvil?' },
  { id: 'seguimiento', name: 'Seguimiento cordial', body: '¡Hola {contacto}! Paso por aquí rápido para saber si pudieron revisar la propuesta de *{proyecto}* para *{negocio}*. Esta semana tengo cupo para dejarlo configurado con sus fotos y precios. ¡Quedo atento!' },
  { id: 'cobro_saldo', name: 'Entrega / Recordatorio de Saldo', body: '¡Hola {contacto}! Ya tenemos listo el avance de *{proyecto}* para *{negocio}*. Queda un saldo pendiente de *{saldo}* para dejarlo publicado y entregado al 100 %. ¿Coordinamos por aquí?' }
];

function sanitizeTiers(raw, svc, cur) {
  if (Array.isArray(raw) && raw.length === 3) return raw.map((t) => ({ id: String(t.id || cryptoId('tier')), name: String(t.name || 'Opción').trim(), price: Math.max(0, Number(t.price || 0)), currency: String(t.currency || cur || 'USD').trim(), days: Math.max(1, Number(t.days || 3)), includes: Array.isArray(t.includes) ? t.includes.map((x) => String(x).trim()).filter(Boolean) : [], pitch: String(t.pitch || '').trim() }));
  return defaultTiersFromService(svc || { price: 60, currency: cur, deliveryDays: 4, deliverables: [] }, cur);
}
function sanitizePayments(arr) {
  if (!Array.isArray(arr)) return []; return arr.map((p) => ({ id: p.id || cryptoId('pay'), date: String(p.date || new Date().toISOString().slice(0, 10)), amount: Math.max(0, Number(p.amount || 0)), currency: String(p.currency || 'USD'), method: String(p.method || 'Efectivo'), note: String(p.note || '').trim() })).filter((x) => x.amount > 0);
}
export function sanitizeProject(p = {}, svcHint = null) {
  const prodStage = String(p.productionStage || '').trim(); const validProd = ['Faltan insumos', 'En diseño', 'Revisión del dueño', 'Publicado']; const stage = String(p.stage || 'Solicitado').trim(); const needsProd = ['Aprobado', 'En desarrollo', 'Revisión', 'Entregado'].includes(stage);
  return {
    id: p.id || cryptoId('prj'), serviceId: String(p.serviceId || svcHint?.id || '').trim(), title: String(p.title || '').trim() || 'Proyecto digital', stage,
    productionStage: validProd.includes(prodStage) ? prodStage : (needsProd ? 'Faltan insumos' : ''),
    price: Math.max(0, Number(p.price || 0) || 0), paid: Math.max(0, Number(p.paid || 0) || 0), currency: String(p.currency || svcHint?.currency || 'USD').trim(),
    deadline: String(p.deadline || '').trim(), notes: String(p.notes || '').trim(),
    checklist: Array.isArray(p.checklist) ? p.checklist.map((it) => ({ text: String(it.text || '').trim(), done: Boolean(it.done) })).filter((it) => it.text) : [],
    onboarding: Array.isArray(p.onboarding) && p.onboarding.length ? p.onboarding.map((it) => ({ text: String(it.text || '').trim(), done: Boolean(it.done) })).filter((it) => it.text) : ONBOARDING_TEMPLATE.map((t) => ({ text: t, done: false })),
    quoteTiers: sanitizeTiers(p.quoteTiers, svcHint, p.currency),
    revisionsIncluded: Math.max(0, Number(p.revisionsIncluded ?? DEFAULT_REVISIONS_INCLUDED)), revisionsUsed: Math.max(0, Number(p.revisionsUsed || 0)), hoursLogged: Math.max(0, Number(p.hoursLogged || 0)),
    payments: sanitizePayments(p.payments), addons: Array.isArray(p.addons) ? p.addons.map((a) => ({ id: String(a.id), name: String(a.name), price: Number(a.price || 0), currency: String(a.currency || 'USD') })).filter((a) => a.name) : [],
    isRecurring: Boolean(p.isRecurring), renewalInterval: String(p.renewalInterval || 'monthly'), nextRenewal: String(p.nextRenewal || p.vault?.expiresAt || '').trim(),
    vault: { url: String(p.vault?.url || p.publicUrl || '').trim(), domain: String(p.vault?.domain || '').trim(), hosting: String(p.vault?.hosting || '').trim(), repo: String(p.vault?.repo || '').trim(), expiresAt: String(p.vault?.expiresAt || p.nextRenewal || '').trim(), notes: String(p.vault?.notes || '').trim() },
    createdAt: p.createdAt || new Date().toISOString()
  };
}
function sanitizeTimeline(arr) { return Array.isArray(arr) ? arr.slice(0, 100).map((e) => ({ id: e.id || cryptoId('ev'), at: e.at || new Date().toISOString(), type: String(e.type || 'nota'), note: String(e.note || '').trim() })).filter((e) => e.note) : []; }
export function sanitizeClient(raw = {}, services = []) {
  const now = new Date().toISOString();
  let projects = Array.isArray(raw.projects) ? raw.projects.map((pr) => { const svc = services.find((s) => s.id === pr.serviceId || norm(s.name) === norm(pr.title)); return sanitizeProject(pr, svc); }) : [];
  const desired = String(raw.desiredProject || '').trim(); const rawStage = String(raw.projectStage || '').trim();
  if (!projects.length && desired) { const svc = services.find((s) => norm(s.name) === norm(desired)); projects = [sanitizeProject({ serviceId: svc?.id || '', title: desired, stage: rawStage && rawStage !== 'Sin proyecto' ? rawStage : 'Solicitado', price: Number(raw.value || svc?.price || 0), paid: Number(raw.paid || 0), currency: raw.currency || svc?.currency || 'USD', deadline: raw.projectDeadline || '', notes: raw.requirements || '', checklist: (svc?.deliverables || []).map((t) => ({ text: t, done: false })) }, svc)]; }
  const primary = projects[0]; const totalPrice = projects.length ? projects.reduce((s, p) => s + p.price + p.addons.reduce((a, ad) => a + Number(ad.price || 0), 0), 0) : (Number(raw.value || 0) || 0); const totalPaid = projects.length ? projects.reduce((s, p) => s + (p.payments?.length ? p.payments.reduce((a, pay) => a + Number(pay.amount || 0), 0) : p.paid), 0) : (Number(raw.paid || 0) || 0);
  return {
    id: raw.id || cryptoId(), name: String(raw.name || '').trim(), province: String(raw.province || '').trim(), address: String(raw.address || '').trim(), type: String(raw.type || '').trim(), contact: String(raw.contact || '').trim(), phone: String(raw.phone || '').trim(), social: String(raw.social || '').trim(), status: normalizeStatus(raw.status),
    desiredProject: projects.length ? projects.map((p) => p.title).join(' + ') : desired, projectStage: primary ? primary.stage : (rawStage || 'Sin proyecto'), currency: primary ? primary.currency : String(raw.currency || 'USD').trim(), value: totalPrice, paid: totalPaid, projectDeadline: primary ? primary.deadline : String(raw.projectDeadline || '').trim(), requirements: primary?.notes || String(raw.requirements || '').trim(), projects,
    nextDate: String(raw.nextDate || '').trim(), evidenceUrl: String(raw.evidenceUrl || '').trim(), evidence: String(raw.evidence || '').trim(), catalogCheck: String(raw.catalogCheck || 'NO está (Verificado)').trim(),
    notes: String(raw.notes || '').trim(), referral: String(raw.referral || raw.referredBy || '').trim(), referredBy: String(raw.referredBy || raw.referral || '').trim(), lossReason: String(raw.lossReason || '').trim(), assignedTo: String(raw.assignedTo || '').trim(), portalToken: String(raw.portalToken || '').trim(),
    cadence: raw.cadence ? { step: Math.max(1, Number(raw.cadence.step || 1)), startedAt: raw.cadence.startedAt || now, lastAt: raw.cadence.lastAt || now } : null,
    timeline: sanitizeTimeline(raw.timeline), audit: raw.audit ? { noCatalog: Boolean(raw.audit.noCatalog), inboxPrices: Boolean(raw.audit.inboxPrices), darkPhotos: Boolean(raw.audit.darkPhotos), noSchedule: Boolean(raw.audit.noSchedule), notOnGoogle: Boolean(raw.audit.notOnGoogle), noLogo: Boolean(raw.audit.noLogo), note: String(raw.audit.note || '').trim() } : null,
    createdAt: raw.createdAt || now, updatedAt: raw.updatedAt || now
  };
}
