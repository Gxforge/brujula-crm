export const PRODUCTION_STAGES = [
  { id: 'Faltan insumos', label: 'Faltan insumos', icon: '📥', color: '#eebd48', hint: 'Esperando material del cliente' },
  { id: 'En diseño', label: 'En diseño / Construcción', icon: '🎨', color: '#4c77c6', hint: 'Trabajo en curso' },
  { id: 'Revisión del dueño', label: 'Revisión del dueño', icon: '👀', color: '#8e5aa5', hint: 'Esperando aprobación final' },
  { id: 'Publicado', label: 'Publicado / Entregado', icon: '🚀', color: '#18a390', hint: 'En producción y facturado' }
];

export const ONBOARDING_TEMPLATE = [
  'Logo en buena calidad (PNG / vector)',
  'Fotos de productos / platos / local',
  'Lista de precios actualizada',
  'Horario de atención y días',
  'Tarjeta Transfermóvil / EnZona / datos de pago',
  'Tarifas de mensajería por zona / municipio'
];

export const DEFAULT_REVISIONS_INCLUDED = 2;

export function defaultOnboarding(checklist = []) {
  return ONBOARDING_TEMPLATE.map((text) => {
    const found = checklist.find((c) => c.text === text);
    return { text, done: Boolean(found?.done) };
  });
}

export function defaultTiersFromService(svc, cur = 'USD') {
  const base = Math.max(10, Number(svc?.price || 60));
  const deliverables = svc?.deliverables || [];
  return [
    {
      id: 'basic', name: 'Básico',
      price: Math.round(base), currency: svc?.currency || cur,
      days: Math.max(2, (svc?.deliveryDays || 4) - 1),
      includes: deliverables.slice(0, 2),
      pitch: 'Presencia digital rápida y profesional.'
    },
    {
      id: 'pro', name: 'Pro — Recomendado ⭐',
      price: Math.round(base * 1.6), currency: svc?.currency || cur,
      days: svc?.deliveryDays || 5,
      includes: deliverables.slice(0, 4),
      pitch: 'La opción más vendida: todo lo esencial + extras.'
    },
    {
      id: 'plus', name: 'Completo',
      price: Math.round(base * 2.25), currency: svc?.currency || cur,
      days: (svc?.deliveryDays || 5) + 3,
      includes: deliverables,
      pitch: 'Todo incluido + soporte prioritario.'
    }
  ];
}

export function onboardingPct(items = []) {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export function hourlyRate(price, hours) {
  const h = Number(hours || 0);
  if (!h || h <= 0) return 0;
  return Math.round((Number(price || 0) / h) * 10) / 10;
}
