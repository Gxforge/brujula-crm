export function calcCommission(price, member) {
  if (!member) return 0;
  const pct = Number(member.commissionPct || 0); const fixed = Number(member.commissionFixed || 0);
  return Math.round((Number(price) * pct / 100 + fixed) * 100) / 100;
}
export function buildPortalToken(client) { return btoa(`${client.id}:${client.name}`).replace(/=/g, '').slice(0, 16); }
export function buildPortalData(client) {
  const totalTasks = client.projects.reduce((s, p) => s + (p.checklist?.length || 0), 0);
  const doneTasks = client.projects.reduce((s, p) => s + (p.checklist?.filter((t) => t.done).length || 0), 0);
  const pct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const pendingInputs = client.projects.flatMap((p) => (p.onboarding || []).filter((i) => !i.done).map((i) => i.text));
  return { clientName: client.name, pct, pendingInputs, projects: client.projects.map((p) => ({ title: p.title, stage: p.stage, prod: p.productionStage, deadline: p.deadline })) };
}
export function extractFromBio(text) {
  const t = String(text || '');
  const phone = (t.match(/\+?53\s*\d[\d\s-]{6,13}/) || [''])[0].replace(/\s/g, '');
  const address = (t.match(/(calle|avenida|reparto|municipio|vedado|playa|centro|#\s*\d+)[^,\n]*/i) || [''])[0].trim();
  const social = (t.match(/https?:\/\/(www\.)?(facebook|instagram)\.com\/[^\s]+/i) || [''])[0];
  const name = (t.split('\n')[0] || '').slice(0, 60).trim();
  let rubro = ''; if (/caf[eé]/i.test(t)) rubro = 'Gastronomía'; else if (/ropa|boutique|moda/i.test(t)) rubro = 'Ropa/Boutique'; else if (/celular|m[óo]vil|taller/i.test(t)) rubro = 'Celulares/Taller'; else if (/dulce|pan/i.test(t)) rubro = 'Dulcería';
  return { name, phone, address, social, type: rubro, evidence: t.slice(0, 220) };
}
