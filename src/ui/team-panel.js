import { esc } from '../core/utils.js';
import { calcCommission, buildPortalToken, buildPortalData } from '../data/team.js';

export function teamHTML(appState, store) {
  const team = appState.team || [];
  return `<div class="extra-box"><b>M31 · Equipo y comisiones</b>
  <div style="display:grid;gap:6px;margin-top:6px">${team.length ? team.map((m) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px;border:1px solid var(--line);border-radius:8px"><span><b>${esc(m.name)}</b> · ${m.commissionPct}% ${m.commissionFixed ? `+ ${m.commissionFixed}` : ''}</span><button class="chip-btn" data-team-del="${esc(m.id)}">×</button></div>`).join('') : '<div style="font-size:12px;color:#94a3b8">Sin equipo aún.</div>'}</div>
  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input id="teamName" placeholder="Nombre" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"><input id="teamPct" type="number" placeholder="%" style="width:70px;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 6px"><input id="teamFixed" type="number" placeholder="fijo" style="width:70px;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 6px"><button class="btn btn-aqua" id="teamAdd" style="padding:6px 10px;font-size:12px">+ Añadir</button></div>
  </div>`;
}
export function portalHTML(client) {
  const token = client.portalToken || buildPortalToken(client);
  const data = buildPortalData(client);
  return `<div class="extra-box"><b>M32 · Portal del cliente (solo lectura)</b>
  <div style="font-size:11px;color:var(--mut)">Comparte este link para que vea su avance sin editar.</div>
  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input value="${location.origin}${location.pathname}#portal=${token}" readonly style="flex:1;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px;font-size:11px"><button class="chip-btn" data-portal-copy="${esc(token)}">Copiar</button></div>
  <div style="margin-top:6px;font-size:12px">Progreso: <b>${data.pct}%</b> · Pendientes: ${data.pendingInputs.slice(0, 3).join(', ') || 'nada'}</div></div>`;
}
export function leadFormHTML() {
  const html = `<form onsubmit="event.preventDefault(); const d=new FormData(this); const q=new URLSearchParams({leadName:d.get('n'),leadPhone:d.get('p'),leadType:d.get('t')}).toString(); location.href=location.pathname+'?'+q; alert('¡Solicitud capturada! Revisa Clientes.');" style="display:grid;gap:8px"><input name="n" placeholder="Nombre negocio" required style="height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px"><input name="p" placeholder="WhatsApp +53" required style="height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px"><input name="t" placeholder="Rubro" style="height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px"><button type="submit" style="height:34px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;font-weight:700">Solicitar demo</button></form>`;
  return `<div class="extra-box"><b>M33 · Formulario captador público</b><div style="font-size:11px;color:var(--mut)">Copia este HTML a tu página o compártelo como link.</div><textarea readonly style="width:100%;height:90px;margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:11px">${esc(html)}</textarea></div>`;
}
export function syncHTML(appState) {
  const s = appState.sync;
  return `<div class="extra-box"><b>M30 · Sincronización Cloudflare D1 (stub)</b><div style="font-size:11px;color:var(--mut)">Funciona 100% offline. Configura tu Worker para sincronizar PC ↔ Android.</div>
  <div style="display:grid;gap:6px;margin-top:6px">
    <input id="syncEndpoint" placeholder="https://tu-worker.workers.dev/sync" value="${esc(s.endpoint)}" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px">
    <input id="syncToken" placeholder="Bearer token (opcional)" value="${esc(s.token)}" style="height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px">
  </div>
  <div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-aqua" id="syncTest" style="padding:6px 10px;font-size:12px">Probar conexión</button><button class="btn btn-secondary" id="syncNow" style="padding:6px 10px;font-size:12px">Sincronizar ahora</button><span style="font-size:11px;color:#94a3b8">${s.lastSync ? 'Último: ' + s.lastSync : 'Sin sync aún'}</span></div>
  <details style="margin-top:6px"><summary style="font-size:11px;cursor:pointer">Ver plantilla Worker (copiar a Cloudflare)</summary><pre style="background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;overflow:auto;font-size:11px;white-space:pre-wrap">export default { async fetch(req, env){ if(req.method==='POST'){ const body=await req.json(); await env.DB.prepare('INSERT OR REPLACE INTO clients (id,data) VALUES (?,?)').bind(body.id, JSON.stringify(body)).run(); return new Response('ok'); } return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})} }</pre></details>
  </div>`;
}
export function bindTeam(appState, store) {
  document.getElementById('teamAdd')?.addEventListener('click', () => {
    const name = document.getElementById('teamName').value.trim(); if (!name) return;
    const m = { id: Date.now().toString(36), name, commissionPct: Number(document.getElementById('teamPct').value || 0), commissionFixed: Number(document.getElementById('teamFixed').value || 0) };
    appState.setTeam([...appState.team, m]); location.reload();
  });
  document.querySelectorAll('[data-team-del]').forEach((b) => b.onclick = () => { appState.setTeam(appState.team.filter((x) => x.id !== b.dataset.teamDel)); location.reload(); });
  document.getElementById('syncTest')?.addEventListener('click', async () => {
    const ep = document.getElementById('syncEndpoint').value.trim(); if (!ep) return alert('Pon endpoint');
    try { const r = await fetch(ep); alert('Respuesta: ' + r.status); } catch (e) { alert('Error: ' + e.message); }
  });
  document.getElementById('syncNow')?.addEventListener('click', () => {
    const ep = document.getElementById('syncEndpoint').value.trim(); const token = document.getElementById('syncToken').value.trim();
    appState.setSync({ endpoint: ep, token, lastSync: new Date().toLocaleString('es-ES') }); alert('Sincronización simulada guardada (offline-first). Con Worker real haría POST de clientes.');
  });
}
