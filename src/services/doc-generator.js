export function generateQuoteCanvas(client, proj, addons = []) {
  const cvs = document.createElement('canvas'); cvs.width = 900; cvs.height = 680; const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 900, 680); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 900, 72);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('BRÚJULA CRM · Cotización Formal', 24, 32);
  ctx.font = '12px sans-serif'; ctx.fillText(`Cliente: ${client.name} · ${client.province || ''} · ${client.phone || ''}`, 24, 54);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(`📦 ${proj.title}`, 24, 108);
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#475569'; ctx.fillText(`Inversión: ${proj.price} ${proj.currency} · Abonado: ${proj.paid} ${proj.currency} · Saldo: ${Math.max(0, proj.price - proj.paid)} ${proj.currency}`, 24, 130);
  let y = 158; ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('Incluye:', 24, y); y += 14; ctx.font = '12px sans-serif'; ctx.fillStyle = '#334155';
  (proj.checklist || []).slice(0, 8).forEach((it) => { ctx.fillText(`✓ ${it.text}`, 28, y); y += 16; });
  if (addons.length) { y += 6; ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('Extras:', 24, y); y += 14; ctx.font = '12px sans-serif'; ctx.fillStyle = '#334155'; addons.forEach((a) => { ctx.fillText(`+ ${a.name} · ${a.price} ${a.currency}`, 28, y); y += 16; }); }
  if (proj.notes) { y += 8; ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.fillText(`Nota: ${proj.notes.slice(0, 110)}`, 24, y); }
  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(24, 620, 852, 1); ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.fillText(`Generado por Brújula CRM · ${new Date().toLocaleDateString('es-ES')} · ${proj.deadline ? 'Entrega: ' + proj.deadline : ''}`, 24, 644);
  return cvs;
}
export function downloadCanvas(cvs, filename) {
  const url = cvs.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
export function generateContractCanvas(client, proj) {
  const cvs = document.createElement('canvas'); cvs.width = 900; cvs.height = 820; const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 900, 820); ctx.fillStyle = '#0f172a'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('ACUERDO DE SERVICIO · 1 PÁGINA', 24, 36);
  ctx.font = '11px sans-serif'; ctx.fillStyle = '#475569'; ctx.fillText(`Entre: Brújula CRM (Proveedor) y ${client.name} (${client.contact || 'Cliente'}) · Tel: ${client.phone}`, 24, 58);
  ctx.fillStyle = '#0f172a'; ctx.font = '12px sans-serif'; let y = 88; const lines = [`Proyecto: ${proj.title}`, `Alcance: ${(proj.checklist || []).map((x) => x.text).join(' · ').slice(0, 180)}`, `Precio total: ${proj.price} ${proj.currency} · Anticipo: ${proj.paid} ${proj.currency} · Saldo a entrega: ${Math.max(0, proj.price - proj.paid)} ${proj.currency}`, `Plazo estimado: ${proj.deadline || 'a convenir'} · Revisiones incluidas: ${proj.revisionsIncluded}`, `El cliente se compromete a entregar insumos (logo, fotos, precios) en 48h. Cambios fuera de alcance se cotizan como extra.`, `Garantía: soporte 7 días post-entrega para ajustes menores.`];
  lines.forEach((ln) => { ctx.fillText(ln, 24, y, 852); y += 20; }); y += 10; ctx.fillStyle = '#e2e8f0'; ctx.fillRect(24, y, 852, 1); y += 18;
  ctx.fillStyle = '#0f172a'; ctx.font = '11px sans-serif'; ctx.fillText('Firma Proveedor: ______________________', 24, y); ctx.fillText('Firma Cliente: ______________________', 480, y); y += 18; ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.fillText(`Fecha: ${new Date().toLocaleDateString('es-ES')} · Este documento es válido como acuerdo entre partes.`, 24, y);
  return cvs;
}
