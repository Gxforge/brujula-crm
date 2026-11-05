import { cryptoId, norm, normalizeStatus } from './utils.js';

export const DEFAULT_TEMPLATES = [
  {
    id: 'primer_contacto',
    name: '1er Contacto · Propuesta de Catálogo',
    body: '¡Hola {contacto}! Vi su negocio *{negocio}* en {provincia} ({rubro}) y me encantó lo que ofrecen. Noté que aún reciben pedidos directos por chat sin un catálogo digital interactivo. Diseño catálogos rápidos donde sus clientes eligen productos y el pedido llega listo a su WhatsApp. ¿Les gustaría ver una muestra sin compromiso?'
  },
  {
    id: 'envio_demo',
    name: 'Envío de Demo / Muestra',
    body: '¡Hola {contacto}! Preparé una vista previa de cómo se vería *{proyecto}* para *{negocio}* con sus productos organizados y pedido directo al WhatsApp. ¿Le comparto el enlace para que lo pruebe desde el móvil?'
  },
  {
    id: 'seguimiento',
    name: 'Seguimiento cordial',
    body: '¡Hola {contacto}! Paso por aquí rápido para saber si pudieron revisar la propuesta de *{proyecto}* para *{negocio}*. Esta semana tengo cupo para dejarlo configurado con sus fotos y precios. ¡Quedo atento!'
  },
  {
    id: 'cobro_saldo',
    name: 'Entrega / Recordatorio de Saldo',
    body: '¡Hola {contacto}! Ya tenemos listo el avance de *{proyecto}* para *{negocio}*. Queda un saldo pendiente de *{saldo}* para dejarlo publicado y entregado al 100 %. ¿Coordinamos por aquí?'
  }
];

export function sanitizeProject(p = {}) {
  return {
    id: p.id || cryptoId('prj'),
    serviceId: String(p.serviceId || ''),
    title: String(p.title || '').trim() || 'Proyecto digital',
    stage: String(p.stage || 'Solicitado').trim(),
    price: Math.max(0, Number(p.price || 0) || 0),
    paid: Math.max(0, Number(p.paid || 0) || 0),
    currency: String(p.currency || 'USD').trim(),
    deadline: String(p.deadline || '').trim(),
    notes: String(p.notes || '').trim(),
    checklist: Array.isArray(p.checklist)
      ? p.checklist
          .map((it) => ({ text: String(it.text || '').trim(), done: Boolean(it.done) }))
          .filter((it) => it.text)
      : [],
    createdAt: p.createdAt || new Date().toISOString()
  };
}

export function sanitizeClient(raw = {}, services = []) {
  const now = new Date().toISOString();
  let projects = Array.isArray(raw.projects) ? raw.projects.map((p) => sanitizeProject(p)) : [];
  const desired = String(raw.desiredProject || '').trim();
  const rawStage = String(raw.projectStage || '').trim();

  if (!projects.length && desired) {
    const matchedSvc = services.find((s) => norm(s.name) === norm(desired));
    projects = [
      sanitizeProject({
        serviceId: matchedSvc?.id || '',
        title: desired,
        stage: rawStage && rawStage !== 'Sin proyecto' ? rawStage : 'Solicitado',
        price: Number(raw.value || matchedSvc?.price || 0),
        paid: Number(raw.paid || 0),
        currency: raw.currency || matchedSvc?.currency || 'USD',
        deadline: raw.projectDeadline || '',
        notes: raw.requirements || '',
        checklist: (matchedSvc?.deliverables || []).map((t) => ({ text: t, done: false }))
      })
    ];
  }

  const primary = projects[0];
  const totalPrice = projects.length ? projects.reduce((s, p) => s + p.price, 0) : (Number(raw.value || 0) || 0);
  const totalPaid = projects.length ? projects.reduce((s, p) => s + p.paid, 0) : (Number(raw.paid || 0) || 0);

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
    desiredProject: projects.length ? projects.map((p) => p.title).join(' + ') : desired,
    projectStage: primary ? primary.stage : (rawStage || 'Sin proyecto'),
    currency: primary ? primary.currency : String(raw.currency || 'USD').trim(),
    value: totalPrice,
    paid: totalPaid,
    projectDeadline: primary ? primary.deadline : String(raw.projectDeadline || '').trim(),
    requirements: primary?.notes || String(raw.requirements || '').trim(),
    projects,
    nextDate: String(raw.nextDate || '').trim(),
    evidenceUrl: String(raw.evidenceUrl || '').trim(),
    evidence: String(raw.evidence || '').trim(),
    catalogCheck: String(raw.catalogCheck || 'NO está (Verificado)').trim(),
    notes: String(raw.notes || '').trim(),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now
  };
}
