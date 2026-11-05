export function calcStreak(lastActive, todayStr) {
  if (!lastActive) return 1; const d1 = new Date(lastActive); const d2 = new Date(todayStr); const diff = Math.floor((d2 - d1) / 86400000); return diff === 1 ? 1 : diff === 0 ? 0 : 0;
}
export function progressPct(current, target) { return Math.min(100, Math.round((Number(current) / Math.max(1, Number(target))) * 100)); }
export function analyticsByCategory(clients) {
  const map = {}; clients.forEach((c) => { const k = c.type || 'Sin rubro'; if (!map[k]) map[k] = { count: 0, converted: 0, value: 0 }; map[k].count++; if (c.status === 'Convertido') map[k].converted++; map[k].value += Number(c.value || 0); });
  return Object.entries(map).map(([k, v]) => ({ name: k, ...v, rate: v.count ? Math.round(v.converted / v.count * 100) : 0 })).sort((a, b) => b.value - a.value);
}
export function analyticsByProvince(clients) {
  const map = {}; clients.forEach((c) => { const k = c.province || 'Sin prov.'; if (!map[k]) map[k] = { count: 0, converted: 0, value: 0 }; map[k].count++; if (c.status === 'Convertido') map[k].converted++; map[k].value += Number(c.value || 0); });
  return Object.entries(map).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.count - a.count);
}
