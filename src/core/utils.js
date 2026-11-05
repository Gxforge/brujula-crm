export const STAGES = [
  { id: 'Pendiente', label: 'Por contactar', color: '#eebd48' },
  { id: 'Contactado', label: 'Contactado', color: '#4c77c6' },
  { id: 'Seguimiento', label: 'Seguimiento', color: '#8e5aa5' },
  { id: 'Propuesta', label: 'Propuesta / Demo', color: '#e86b4a' },
  { id: 'Convertido', label: 'Convertido', color: '#18a390' },
  { id: 'Descartado', label: 'Descartado', color: '#c95257' }
];

export const CUBA_PROVINCES = [
  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
  'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
  'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba',
  'Guantánamo', 'Isla de la Juventud'
];

export const ICONS = {
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.3 9.2 9.2 0 0 1-3.8-.84L3 21l1.9-5.44A8.1 8.1 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3a8.38 8.38 0 0 1 8.5 8.5Z"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(val) {
  return String(val ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

export function norm(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function cryptoId(prefix = 'c') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export function extractPrimaryPhone(rawPhone) {
  if (!rawPhone) return '';
  const firstSegment = String(rawPhone).split(/[\/|,;]/)[0];
  let digits = firstSegment.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 8 && /^[567234]/.test(digits)) {
    digits = '53' + digits;
  } else if (!digits.startsWith('53') && digits.length >= 8 && digits.length <= 9) {
    digits = '53' + digits;
  }
  return digits;
}

export function phoneKey(rawPhone) {
  const digits = extractPrimaryPhone(rawPhone);
  return digits.replace(/^53/, '');
}

export function buildWhatsAppUrl(rawPhone, message = '') {
  const digits = extractPrimaryPhone(rawPhone);
  if (!digits) return '';
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function openExternalUrl(url) {
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}

export function normalizeStatus(raw) {
  const s = norm(raw);
  if (s.includes('convert') || s.includes('ganad') || s.includes('cerrad') || s.includes('client')) return 'Convertido';
  if (s.includes('propuest') || s.includes('demo') || s.includes('cotiz')) return 'Propuesta';
  if (s.includes('seguim') || s.includes('interes')) return 'Seguimiento';
  if (s.includes('contact') || s.includes('escrib') || s.includes('habl')) return 'Contactado';
  if (s.includes('descart') || s.includes('perdid') || s.includes('nointeres')) return 'Descartado';
  return 'Pendiente';
}

export function statusLabel(status) {
  return STAGES.find((x) => x.id === status)?.label || status || 'Por contactar';
}

export function formatDate(isoDate) {
  if (!isoDate) return '';
  try {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoDate;
  }
}

export function relativeTime(isoStr) {
  if (!isoStr) return 'Sin registro';
  const diff = Math.max(0, Date.now() - new Date(isoStr).getTime());
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 1) return `Hace ${days} días`;
  if (days === 1) return 'Ayer';
  if (hours >= 1) return `Hace ${hours} h`;
  if (mins >= 2) return `Hace ${mins} min`;
  return 'Justo ahora';
}

export function showToast(title, message = '', isError = false) {
  const el = $('#toast');
  if (!el) return;
  el.className = `toast show${isError ? ' error' : ''}`;
  el.innerHTML = `<b>${esc(title)}</b>${esc(message)}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.className = 'toast';
  }, 3800);
}
