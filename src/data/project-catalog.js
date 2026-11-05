// Catálogo modular de servicios/proyectos digitales, etapas y mecánicas de puntuación

export const CURRENCIES = ['USD', 'CUP', 'MLC', 'EUR'];

export const PROJECT_STAGES = [
  { id: 'Sin proyecto', label: 'Sin proyecto aún', color: '#94a3b8' },
  { id: 'Solicitado', label: 'Solicitado / Interesado', color: '#eebd48' },
  { id: 'Cotizado', label: 'Cotización enviada', color: '#4c77c6' },
  { id: 'Aprobado', label: 'Aprobado (Anticipo)', color: '#8e5aa5' },
  { id: 'En desarrollo', label: 'En desarrollo', color: '#e86b4a' },
  { id: 'Revisión', label: 'En revisión / Demo', color: '#0ea5e9' },
  { id: 'Entregado', label: 'Entregado y activo', color: '#18a390' },
  { id: 'Pausado', label: 'Pausado / Descartado', color: '#c95257' }
];

export const DEFAULT_SERVICES = [
  { id: 'svc_catalogo_qr', name: 'Catálogo Digital + Menú QR', category: 'Catálogos', price: 60, currency: 'USD', deliveryDays: 3, summary: 'Catálogo móvil rápido con fotos, categorías, buscador y pedido directo al WhatsApp.', deliverables: ['Diseño adaptado con logo y colores del negocio', 'Carga inicial de productos, precios y fotos', 'Carrito que arma el pedido listo hacia WhatsApp', 'Código QR imprimible para mesas o mostrador'] },
  { id: 'svc_tienda_multimoneda', name: 'Tienda Online Multi-Moneda + Domicilio', category: 'E-Commerce', price: 120, currency: 'USD', deliveryDays: 6, summary: 'Tienda completa con cambio CUP/USD/MLC, tarifas por reparto/municipio y panel de stock.', deliverables: ['Selector de moneda (CUP, USD, MLC) en tiempo real', 'Cálculo automático de mensajería por zona/municipio', 'Panel de administración para agotar o editar precios', 'Integración con Transfermóvil / EnZona / WhatsApp'] },
  { id: 'svc_web_corporativa', name: 'Página Web Corporativa / Reservas', category: 'Web', price: 150, currency: 'USD', deliveryDays: 7, summary: 'Sitio profesional para restaurantes, hostales, clínicas o MIPYMES con SEO y reservas.', deliverables: ['Secciones de Inicio, Servicios, Galería y Ubicación', 'Formulario de reserva o cotización conectado a WhatsApp', 'Optimización para aparecer en Google (SEO local)', 'Dominio personalizado y certificado SSL seguro'] },
  { id: 'svc_pos_inventario', name: 'Sistema POS + Inventario Offline', category: 'Software PC/Tablet', price: 180, currency: 'USD', deliveryDays: 10, summary: 'Punto de venta sin internet para controlar almacén, turnos de caja, mermas y ganancias.', deliverables: ['Instalador para PC Windows y Android 100 % offline', 'Control de entradas, salidas y alerta de stock mínimo', 'Cierre de caja diario por dependiente y reportes Excel', 'Capacitación rápida al dueño y personal'] },
  { id: 'svc_app_android', name: 'App Android Propia (.APK)', category: 'Móvil', price: 160, currency: 'USD', deliveryDays: 8, summary: 'Aplicación instalable Android con el icono del negocio para fidelizar clientes frecuentes.', deliverables: ['Archivo .APK firmado con icono y pantalla de carga propia', 'Funcionamiento rápido con caché offline de productos', 'Acceso directo a pedidos, promociones y contacto', 'Enlace y código QR de descarga directa'] },
  { id: 'svc_branding_redes', name: 'Pack Identidad Visual + Redes', category: 'Diseño', price: 50, currency: 'USD', deliveryDays: 4, summary: 'Renovación de logo, biografía optimizada de Instagram/Facebook y plantillas de historias.', deliverables: ['Rediseño o vectorización de logotipo principal', 'Optimización de perfil FB/IG con destacados e iconos', '6 plantillas editables para ofertas y nuevos productos'] },
  { id: 'svc_mantenimiento_mensual', name: 'Plan Mensual Hosting + Actualizaciones', category: 'Recurrente', price: 15, currency: 'USD', deliveryDays: 1, summary: 'Soporte continuo, cambio de precios/fotos bajo demanda y mantenimiento de servidor.', deliverables: ['Hosting activo 24/7 y copias de seguridad', 'Hasta 4 actualizaciones de precios o menú al mes', 'Soporte prioritario por WhatsApp'] }
];

export function computeLeadScore(client) {
  let s = 15;
  if (client.phone && client.phone.replace(/\D/g, '').length >= 8) s += 20;
  if (client.contact && !/administraci/i.test(client.contact)) s += 10;
  if (client.desiredProject || client.projects?.length) s += 25;
  if (Number(client.value) > 0) s += 15;
  if (client.status === 'Propuesta' || client.status === 'Seguimiento') s += 10;
  if (client.status === 'Convertido') s = 100;
  if (client.status === 'Descartado') s = 5;
  s = Math.min(100, Math.max(5, s));
  const tier = s >= 70 ? { label: 'Caliente', cls: 'hot', icon: '🔥' } : s >= 45 ? { label: 'Tibio', cls: 'warm', icon: '🌤️' } : { label: 'Frío', cls: 'cold', icon: '❄️' };
  return { score: s, ...tier };
}

export function buildProjectQuoteMessage(client, proj) {
  const contact = client.contact && !/administraci|@/i.test(client.contact) ? client.contact.split('(')[0].trim() : 'equipo';
  const title = proj?.title || client.desiredProject || 'Catálogo Digital Interactivo';
  const cur = proj?.currency || client.currency || 'USD';
  const price = Number(proj?.price ?? client.value ?? 0);
  const paid = Number(proj?.paid ?? client.paid ?? 0);
  const pending = Math.max(0, price - paid);
  const items = (proj?.checklist || []).map((it) => `  ✓ ${it.text}`).join('\n');
  let m = `¡Hola ${contact}! Aquí tienes el resumen de la propuesta para *${client.name || 'su negocio'}*:\n\n📦 *Proyecto:* ${title}\n`;
  if (items) m += `📋 *Incluye:*\n${items}\n`;
  if (proj?.notes || client.requirements) m += `🎯 *Detalles solicitados:* ${proj?.notes || client.requirements}\n`;
  if (price > 0) { m += `💰 *Inversión:* ${price} ${cur}`; if (paid > 0) m += ` (Abonado: ${paid} ${cur} · Pendiente: ${pending} ${cur})`; m += `\n`; }
  if (proj?.deadline || client.projectDeadline) m += `📅 *Entrega estimada:* ${proj?.deadline || client.projectDeadline}\n`;
  m += `\n¿Confirmamos estos detalles para avanzar?`; return m;
}

export function buildTieredQuoteMessage(client, proj) {
  const contact = client.contact && !/administraci|@/i.test(client.contact) ? client.contact.split('(')[0].trim() : 'equipo';
  let m = `¡Hola ${contact}! Para *${client.name || 'su negocio'}* preparé 3 opciones para *${proj.title}*:\n\n`;
  (proj.quoteTiers || []).forEach((t, i) => {
    const label = ['1️⃣', '2️⃣', '3️⃣'][i] || `${i + 1}.`;
    m += `${label} *${t.name}* — *${t.price} ${t.currency}* · ⏱ ${t.days} días\n`;
    if (t.pitch) m += `   _${t.pitch}_\n`;
    (t.includes || []).forEach((inc) => { m += `   ✓ ${inc}\n`; });
    m += `\n`;
  });
  if (proj.notes) m += `🎯 *Pedido especial:* ${proj.notes}\n`;
  m += `Responde con *1, 2 o 3* y lo dejamos agendado. ¿Cuál prefieres?`; return m;
}
