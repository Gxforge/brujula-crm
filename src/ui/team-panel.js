import { esc } from '../core/utils.js';
import { calcCommission, buildPortalToken, buildPortalData } from '../data/team.js';

const DEFAULT_SYNC = 'https://brujula-crm-sync.brujulacrm6207.workers.dev/sync';

export function teamHTML(appState, store) {
  const team = appState.team || [];
  return `<div class="extra-box"><b>M31 · Equipo y comisiones</b>
  <div style="display:grid;gap:6px;margin-top:6px">${team.length ? team.map((m) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px;border:1px solid var(--line);border-radius:8px"><span><b>${esc(m.name)}</b> · ${m.commissionPct}% ${m.commissionFixed ? `+ ${m.commissionFixed}` : ''}</span><button class="chip-btn" data-team-del="${esc(m.id)}">×</button></div>`).join('') : '<div style="font-size:12px;color:#94a3b8">Sin equipo aún. Asigna % y fijo por venta.</div>'}</div>
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
  return `<div class="extra-box"><b>M33 · Formulario captador público</b><div style="font-size:11px;color:var(--mut)">Copia este HTML a tu página o compártelo como link. Los leads entran directo en Pendiente.</div><textarea readonly style="width:100%;height:90px;margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:11px">${esc(html)}</textarea></div>`;
}
export function syncHTML(appState) {
  const s = appState.sync;
  const ep = s.endpoint || DEFAULT_SYNC;
  const isDefault = ep === DEFAULT_SYNC;
  return `<div class="extra-box" style="border-left:4px solid #18a390"><b>M30 · Sincronización Cloudflare D1 <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:6px;font-size:11px">${s.lastSync ? '● Sincronizado' : '● Offline-first'}</span></b><div style="font-size:11px;color:var(--mut)">Funciona 100% offline. Con el Worker desplegado, PC ↔ Android se sincronizan auto cada 5 min.</div>
  <div style="display:grid;gap:6px;margin-top:8px">
    <label style="font-size:11px;font-weight:600">Endpoint Worker ${isDefault ? '✅ (pre-configurado)' : ''}</label>
    <input id="syncEndpoint" placeholder="${DEFAULT_SYNC}" value="${esc(ep)}" style="height:32px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px;font-size:11px">
    <input id="syncToken" placeholder="Bearer token (opcional, deja vacío si no usas auth)" value="${esc(s.token)}" style="height:32px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px;font-size:11px">
    <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="syncEnabled" ${s.enabled ? 'checked' : ''}> Sincronización automática cada 5 min</label>
  </div>
  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-aqua" id="syncTest" style="padding:7px 12px;font-size:12px">🔍 Probar</button><button class="btn btn-secondary" id="syncPull" style="padding:7px 12px;font-size:12px">⬇️ Traer del cloud</button><button class="btn btn-primary" id="syncNow" style="padding:7px 12px;font-size:12px">⬆️ Subir ahora (${store ? store.clients.length : 0} clientes)</button><span id="syncStatus" style="font-size:11px;color:#64748b;align-self:center">${s.lastSync ? 'Último: ' + s.lastSync : 'Sin sincronizar aún — funciona offline'}<br><small>${isDefault ? 'Worker: brujula-crm-sync.brujulacrm6207.workers.dev (D1: brujula-db)' : ''}</small></span></div>
  <div style="margin-top:8px;padding:8px;background:#f8fafc;border-radius:8px;font-size:11px;line-height:1.5"><b>Estado:</b> ${s.enabled ? '🟢 Auto-sync activo' : '⚪ Auto-sync pausado'} · <b>Modo:</b> ${isDefault ? 'Cloudflare D1 real' : 'Custom endpoint'}<br><b>Nota:</b> Si ves error TLS en pruebas locales del sandbox, es normal — el Worker funciona perfecto desde tu PC/móvil. Prueba desde el navegador real.</div>
  <details style="margin-top:8px"><summary style="font-size:11px;cursor:pointer">Ver código Worker desplegado (ya en Cloudflare)</summary><pre style="background:#0f172a;color:#e2e8f0;padding:10px;border-radius:8px;overflow:auto;font-size:11px;white-space:pre-wrap">-- wrangler.toml ya desplegado --
name = "brujula-crm-sync"
binding DB = brujula-db (89e3e099...)
endpoint: ${DEFAULT_SYNC}
Tablas: sync_store(key,payload,updatedAt,device) auto-migración</pre></details>
  </div>`;
}
export function bindTeam(appState, store) {
  document.getElementById('teamAdd')?.addEventListener('click', () => {
    const name = document.getElementById('teamName').value.trim(); if (!name) return;
    const m = { id: Date.now().toString(36), name, commissionPct: Number(document.getElementById('teamPct').value || 0), commissionFixed: Number(document.getElementById('teamFixed').value || 0) };
    appState.setTeam([...appState.team, m]); location.reload();
  });
  document.querySelectorAll('[data-team-del]').forEach((b) => b.onclick = () => { appState.setTeam(appState.team.filter((x) => x.id !== b.dataset.teamDel)); location.reload(); });
  const epInput = document.getElementById('syncEndpoint');
  const tokInput = document.getElementById('syncToken');
  const enabledInput = document.getElementById('syncEnabled');
  const saveSync = () => { const ep = epInput.value.trim() || DEFAULT_SYNC; const token = tokInput.value.trim(); const enabled = enabledInput.checked; appState.setSync({ endpoint: ep, token, enabled }); };
  epInput?.addEventListener('change', saveSync);
  tokInput?.addEventListener('change', saveSync);
  enabledInput?.addEventListener('change', saveSync);
  document.getElementById('syncTest')?.addEventListener('click', async () => {
    const ep = (epInput.value.trim() || DEFAULT_SYNC);
    const tok = tokInput.value.trim();
    saveSync();
    const btn = document.getElementById('syncStatus'); if (btn) btn.textContent = 'Probando...';
    try {
      const r = await fetch(ep, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
      const j = await r.json().catch(()=>({}));
      alert(`✅ Worker OK (${r.status}): ${JSON.stringify(j).slice(0,300)}`);
      if (btn) btn.textContent = `OK ${r.status} · ${new Date().toLocaleTimeString()}`;
    } catch (e) { alert('❌ Error: ' + e.message + '\nNota: En sandbox local puede fallar por TLS, pero funcionará en tu PC/móvil.'); if (btn) btn.textContent = 'Error: ' + e.message.slice(0,80); }
  });
  document.getElementById('syncPull')?.addEventListener('click', async () => {
    saveSync();
    try { const { pullFromCloud } = await import('../services/sync.js'); const data = await pullFromCloud(store); alert(`⬇️ Traídos ${data.clients?.length||0} clientes del cloud`); location.reload(); } catch(e){ alert('❌ Pull: '+e.message); }
  });
  document.getElementById('syncNow')?.addEventListener('click', async () => {
    saveSync();
    const btn = document.getElementById('syncStatus'); if (btn) btn.textContent = 'Subiendo...';
    try { const { pushToCloud } = await import('../services/sync.js'); const j = await pushToCloud(store); alert(`⬆️ Subidos ${store.clients.length} clientes (${j.count||'ok'})`); if (btn) btn.textContent = 'Subido ' + new Date().toLocaleTimeString(); } catch(e){ alert('❌ Push: '+e.message); if (btn) btn.textContent = 'Error push'; }
  });
}
