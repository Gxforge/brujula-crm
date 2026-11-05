import { esc } from '../core/utils.js';

function svgBarChart(data, w = 480, h = 140) {
  const max = Math.max(1, ...data.map((d) => d.value)); const bw = w / data.length * 0.6; const gap = w / data.length * 0.4;
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px">`;
  data.forEach((d, i) => {
    const bh = (d.value / max) * (h - 30); const x = i * (bw + gap) + gap / 2; const y = h - bh - 18;
    svg += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${d.color || '#0ea5e9'}"/>`;
    svg += `<text x="${x + bw / 2}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#475569">${esc(d.label.slice(0, 8))}</text>`;
    svg += `<text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${d.value}</text>`;
  });
  svg += `</svg>`; return svg;
}
function svgFunnel(stages, w = 480, h = 160) {
  const max = Math.max(1, ...stages.map((s) => s.count)); let y = 10;
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px">`;
  stages.forEach((s) => {
    const bw = 40 + (s.count / max) * (w - 80); const x = (w - bw) / 2;
    svg += `<rect x="${x}" y="${y}" width="${bw}" height="18" rx="9" fill="${s.color}"/>`;
    svg += `<text x="${w / 2}" y="${y + 12}" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">${esc(s.label)} · ${s.count}</text>`;
    y += 24;
  });
  svg += `</svg>`; return svg;
}
export function renderSellerFunnel(store) {
  const sellers = {}; store.clients.forEach((c) => { const s = c.assignedTo || 'Sin asignar'; if (!sellers[s]) sellers[s] = { Pendiente: 0, Contactado: 0, Propuesta: 0, Convertido: 0, total: 0 }; sellers[s][c.status] = (sellers[s][c.status] || 0) + 1; sellers[s].total++; });
  const ids = Object.keys(sellers);
  if (!ids.length) return '<div style="font-size:12px;color:#94a3b8">Sin vendedores asignados. Asigna en ficha.</div>';
  return ids.map((id) => {
    const name = store.clients.find((c) => c.id === id)?.contact || (store.team ? store.team.find((t) => t.id === id)?.name : null) || id;
    const d = sellers[id];
    const conv = d.total ? Math.round((d.Convertido / d.total) * 100) : 0;
    return `<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px"><b>${esc(name)}</b><span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:6px;font-weight:700">${conv}% conv.</span></div><div style="display:flex;gap:4px;margin-top:6px;font-size:11px">${['Pendiente', 'Contactado', 'Propuesta', 'Convertido'].map((k) => `<span style="background:#eef2f8;padding:2px 6px;border-radius:6px">${k} ${d[k] || 0}</span>`).join('')}</div></div>`;
  }).join('');
}
export function renderRevenueTrend(store) {
  // últimos 6 meses simulados por createdAt
  const months = {}; const now = new Date();
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = d.toLocaleDateString('es-ES', { month: 'short' }); months[key] = 0; }
  store.clients.forEach((c) => c.projects.forEach((p) => { const k = new Date(p.createdAt).toLocaleDateString('es-ES', { month: 'short' }); if (months[k] !== undefined) months[k] += Number(p.price || 0); }));
  const data = Object.entries(months).map(([label, value]) => ({ label, value, color: '#18a390' }));
  return svgBarChart(data);
}
export function renderConversionMetrics(store) {
  const total = store.clients.length; const conv = store.clients.filter((c) => c.status === 'Convertido').length; const rate = total ? Math.round((conv / total) * 100) : 0;
  const avgTicket = total ? Math.round(store.clients.reduce((s, c) => s + Number(c.value || 0), 0) / Math.max(1, conv)) : 0;
  const stages = [{ label: 'Pendiente', count: store.clients.filter((c) => c.status === 'Pendiente').length, color: '#eebd48' }, { label: 'Contactado', count: store.clients.filter((c) => c.status === 'Contactado').length, color: '#4c77c6' }, { label: 'Propuesta', count: store.clients.filter((c) => c.status === 'Propuesta').length, color: '#e86b4a' }, { label: 'Convertido', count: conv, color: '#18a390' }];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px"><div class="mini-kpi"><small>Tasa conversión</small><b style="font-size:18px">${rate}%</b><span style="font-size:11px;color:var(--mut)">${conv}/${total} clientes</span></div><div class="mini-kpi"><small>Ticket promedio</small><b style="font-size:18px">$${avgTicket}</b><span style="font-size:11px;color:var(--mut)">por convertido</span></div></div>${svgFunnel(stages)}`;
}
export function renderAdvancedDashboard(store, appState) {
  return `<div style="display:grid;gap:12px">
    <div class="panel" style="padding:12px"><h3 style="margin:0 0 8px;font-size:13px">📈 Ingresos últimos 6 meses</h3>${renderRevenueTrend(store)}</div>
    <div class="panel" style="padding:12px"><h3 style="margin:0 0 8px;font-size:13px">🎯 Conversión y embudo</h3>${renderConversionMetrics(store)}</div>
    <div class="panel" style="padding:12px"><h3 style="margin:0 0 8px;font-size:13px">👥 Embudo por vendedor (M31)</h3>${renderSellerFunnel(store)}</div>
  </div>`;
}
