export const RENEWAL_INTERVALS = [
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' }
];
export function daysUntil(dateStr) {
  if (!dateStr) return 999; const d = new Date(dateStr + 'T12:00:00'); const now = new Date(); const diff = Math.floor((d - now) / 86400000); return diff;
}
export function renewalAlertLevel(days) {
  if (days < 0) return { label: 'Vencido', color: '#c95257' };
  if (days <= 1) return { label: 'Vence mañana', color: '#c95257' };
  if (days <= 7) return { label: `En ${days} días`, color: '#eebd48' };
  if (days <= 15) return { label: `En ${days} días`, color: '#4c77c6' };
  return null;
}
export function calcMRR(clients) {
  let mrr = 0, oneOff = 0;
  clients.forEach((c) => (c.projects || []).forEach((p) => {
    if (p.isRecurring) mrr += Number(p.price || 0);
    else oneOff += Number(p.price || 0);
  }));
  return { mrr, oneOff };
}
export function upsellCandidates(clients, days = 30) {
  const cutoff = Date.now() - days * 86400000;
  return clients.filter((c) => c.projects?.some((p) => new Date(p.createdAt).getTime() < cutoff && p.price < 80 && !p.title.toLowerCase().includes('tienda') && !p.title.toLowerCase().includes('app'))).slice(0, 12);
}
