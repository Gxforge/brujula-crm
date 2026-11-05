export const PAYMENT_METHODS = ['Efectivo', 'Transfermóvil', 'EnZona', 'Zelle', 'USDT', 'Tarjeta MLC', 'Otro'];
export const DEFAULT_RATES = { base: 'USD', USD: 1, CUP: 400, MLC: 1.15, EUR: 1.08 };
export const ADDON_CATALOG = [
  { id: 'ad_50prod', name: 'Carga de 50 productos extra', price: 15, currency: 'USD' },
  { id: 'ad_logo', name: 'Rediseño de logo', price: 20, currency: 'USD' },
  { id: 'ad_qrposters', name: 'Carteles QR para mesas (x10)', price: 10, currency: 'USD' },
  { id: 'ad_photos', name: 'Sesión fotos local', price: 25, currency: 'USD' },
  { id: 'ad_domain', name: 'Dominio .com 1 año', price: 18, currency: 'USD' },
  { id: 'ad_seo', name: 'SEO local Google', price: 30, currency: 'USD' }
];
export function convertToBase(amount, fromCur, rates) {
  const r = rates || DEFAULT_RATES; const base = r.base || 'USD';
  if (fromCur === base) return Number(amount);
  const fromRate = Number(r[fromCur] || 1); const baseRate = Number(r[base] || 1);
  // rates stored as 1 base = X fromCur => amountInBase = amount / fromRate * baseRate
  return (Number(amount) / fromRate) * baseRate;
}
export function sumInBase(projects, rates) {
  let t = 0; projects.forEach((p) => { t += convertToBase(p.price || 0, p.currency, rates); }); return Math.round(t);
}
export function paymentTotal(payments) { return (payments || []).reduce((s, x) => s + Number(x.amount || 0), 0); }
