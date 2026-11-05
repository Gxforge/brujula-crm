export const CADENCE_STEPS = [
  { step: 1, label: 'Día 1: Primer contacto', tip: 'Diagnóstico + catálogo', offset: 0 },
  { step: 2, label: 'Día 3: Muestra demo', tip: 'Envía demo del rubro', offset: 3 },
  { step: 3, label: 'Día 7: Caso de éxito', tip: 'Testimonio cercano', offset: 7 },
  { step: 4, label: 'Día 14: Cierre con cupo', tip: 'Último cupo del mes', offset: 14 }
];
export const DEMO_PRESETS = {
  'Gastronomía': 'https://ejemplo.com/demo/restaurante',
  'Ropa/Boutique': 'https://ejemplo.com/demo/boutique',
  'Celulares/Taller': 'https://ejemplo.com/demo/celulares',
  'Dulcería/Panadería': 'https://ejemplo.com/demo/dulceria',
  'Belleza/Barbería': 'https://ejemplo.com/demo/barberia',
  'default': 'https://ejemplo.com/demo/general'
};
export const BATTLECARDS = [
  { id: 'caro', label: 'Es muy caro', reply: 'Entiendo, por eso armé 3 opciones: Básica $60, Pro $95 y Completa $135. La Pro ya incluye todo lo esencial y se paga sola con 2 pedidos extra al mes. ¿Probamos esa?' },
  { id: 'fotos', label: 'No tengo fotos', reply: '¡No te preocupes! Puedo arrancar con fotos del móvil y luego las cambiamos. Tengo sesión express incluida si quieres — ¿agendamos?' },
  { id: 'precios_cambian', label: 'Mis precios cambian', reply: 'Perfecto, el catálogo tiene panel para que edites precios tú mismo en 10 segundos desde el móvil, sin depender de mí. ¿Te muestro?' },
  { id: 'luego', label: 'Lo veo el mes que viene', reply: 'Claro, pero este mes tengo cupo para dejarte el QR listo en 3 días y congelar el precio. ¿Te reservo el cupo sin compromiso?' },
  { id: 'ya_tengo', label: 'Ya tengo página', reply: 'Genial — ¿te hago una auditoría rápida de 1 min para ver si estás perdiendo pedidos por chat? Si todo está bien, te digo honesto.' }
];
export function getDemoForType(type) {
  const k = Object.keys(DEMO_PRESETS).find((c) => (type || '').toLowerCase().includes(c.toLowerCase().split('/')[0]));
  return DEMO_PRESETS[k] || DEMO_PRESETS.default;
}
export function isGoingCold(client) {
  const last = client.updatedAt || client.createdAt; if (!last) return false;
  const diff = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  return diff >= 4 && ['Contactado', 'Propuesta', 'Seguimiento'].includes(client.status) ? diff : 0;
}
export function burstQueue(clients, limit = 10) {
  const pool = clients.filter((c) => c.status === 'Pendiente' || c.cadence?.step < 4);
  pool.sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'));
  return pool.slice(0, limit);
}
