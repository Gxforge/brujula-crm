export const PAIN_POINTS = [
  { id: 'noCatalog', label: 'Sin catálogo digital', weight: 3 },
  { id: 'inboxPrices', label: 'Precios por inbox / comentarios', weight: 2 },
  { id: 'darkPhotos', label: 'Fotos oscuras / sin calidad', weight: 2 },
  { id: 'noSchedule', label: 'Sin horario publicado', weight: 1 },
  { id: 'notOnGoogle', label: 'No aparece en Google Maps', weight: 2 },
  { id: 'noLogo', label: 'Sin logo nítido', weight: 1 }
];
export const LOSS_REASONS = ['Precio', 'Ya tiene sistema', 'Negocio cerrado', 'Sin respuesta', 'No decide él', 'Para después', 'Competencia local'];
export function scoreAudit(audit) {
  let s = 0; PAIN_POINTS.forEach((p) => { if (audit[p.id]) s += p.weight; }); return s;
}
export function buildAuditMessage(client, audit) {
  const pains = PAIN_POINTS.filter((p) => audit[p.id]).map((p) => p.label);
  if (!pains.length) return `¡Hola ${client.contact || 'equipo'}! Revisé ${client.name} — está bastante completo. ¿Quieres que lo llevemos al siguiente nivel con catálogo y pedidos al WA?`;
  let m = `¡Hola ${client.contact || 'equipo'}! Hice una revisión rápida de *${client.name}* y noté:\n`;
  pains.forEach((pl) => m += `• ${pl}\n`);
  m += `\nCon un catálogo QR resuelves esos 3 puntos: precios visibles, fotos ordenadas y pedido directo al WhatsApp. ¿Te muestro una demo de tu rubro en 2 min?`;
  return m;
}
export function findDuplicates(clients) {
  const seen = new Map(); const dups = [];
  clients.forEach((c) => {
    const k1 = (c.phone || '').replace(/\D/g, '').slice(-8);
    const k2 = (c.evidenceUrl || '').toLowerCase().trim();
    [k1 && `p:${k1}`, k2 && `u:${k2}`].forEach((k) => {
      if (!k) return; if (seen.has(k)) dups.push([seen.get(k), c]); else seen.set(k, c);
    });
  });
  return dups;
}
