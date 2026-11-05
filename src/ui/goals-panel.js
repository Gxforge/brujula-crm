import { esc } from '../core/utils.js';
import { progressPct, analyticsByCategory, analyticsByProvince } from '../data/goals.js';

export function goalsHTML(appState, store) {
  const g = appState.goals; const totalSales = store.clients.reduce((s, c) => s + Number(c.value || 0), 0); const pct = progressPct(totalSales, g.monthlyTarget);
  return `<div class="extra-box"><b>M34 · Meta mensual + Racha</b>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
    <div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:11px"><span>Meta: ${g.monthlyTarget} ${g.currency}</span><span>${totalSales} · ${pct}%</span></div><div class="proj-bar"><i style="width:${pct}%"></i></div></div>
    <span style="background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:8px;font-size:12px;font-weight:700">🔥 Racha ${g.streak} días</span>
  </div>
  <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input id="goalTarget" type="number" value="${g.monthlyTarget}" style="width:90px;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:0 8px"> <select id="goalCur" style="height:30px;border:1px solid #cbd5e1;border-radius:7px"><option ${g.currency === 'USD' ? 'selected' : ''}>USD</option><option ${g.currency === 'CUP' ? 'selected' : ''}>CUP</option></select> <button class="btn btn-aqua" id="saveGoal" style="padding:6px 10px;font-size:12px">Guardar meta</button></div>
  </div>`;
}
export function analyticsHTML(store) {
  const byCat = analyticsByCategory(store.clients).slice(0, 6);
  const byProv = analyticsByProvince(store.clients).slice(0, 6);
  return `<div class="extra-box"><b>M35 · Rentabilidad por rubro y provincia</b>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">
    <div><small style="color:var(--mut)">Por rubro</small>${byCat.map((r) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(r.name)} (${r.count})</span><b>${r.rate}% · $${r.value}</b></div>`).join('') || '<div style="font-size:11px;color:#94a3b8">Sin datos</div>'}</div>
    <div><small style="color:var(--mut)">Por provincia</small>${byProv.map((r) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid var(--line)"><span>${esc(r.name)} (${r.count})</span><b>$${r.value}</b></div>`).join('') || '<div style="font-size:11px;color:#94a3b8">Sin datos</div>'}</div>
  </div></div>`;
}
export function themeHTML(appState) {
  return `<div class="extra-box"><b>M37 · Tema</b><div style="display:flex;gap:6px;margin-top:6px"><button class="chip-btn" data-theme="light">☀️ Claro</button><button class="chip-btn" data-theme="dark">🌙 Oscuro OLED</button><button class="chip-btn" data-theme="contrast">🔆 Alto contraste</button></div></div>`;
}
export function snapshotsHTML(appState) {
  const snaps = appState.snaps;
  return `<div class="extra-box"><b>M38 · Puntos de restauración (5)</b>${snaps.length ? snaps.map((s) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:6px 0;border-bottom:1px solid var(--line)"><span>${new Date(s.at).toLocaleString('es-ES')}</span><button class="chip-btn" data-restore="${esc(s.id)}">Restaurar</button></div>`).join('') : '<div style="font-size:11px;color:#94a3b8">Sin snapshots aún. Se guardan antes de importaciones.</div>'}<button class="btn btn-secondary" id="takeSnap" style="margin-top:6px;padding:6px 10px;font-size:12px">📸 Crear snapshot ahora</button></div>`;
}
export function extractorHTML() {
  return `<div class="extra-box"><b>M40 · Extractor de biografía desordenada</b><div style="font-size:11px;color:var(--mut)">Pega texto de FB/IG/Revolico y extrae teléfono, dirección y rubro.</div><textarea id="bioInput" placeholder="Pega aquí bio copiada..." style="width:100%;height:70px;margin-top:6px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:12px"></textarea><button class="btn btn-aqua" id="runExtract" style="margin-top:6px;padding:6px 10px;font-size:12px">Extraer → Crear borrador</button><div id="extractOut" style="font-size:11px;margin-top:6px;color:var(--mut)"></div></div>`;
}
export function bindGoals(appState, store) {
  document.getElementById('saveGoal')?.addEventListener('click', () => { appState.setGoals({ monthlyTarget: Number(document.getElementById('goalTarget').value || 500), currency: document.getElementById('goalCur').value }); location.reload(); });
  document.querySelectorAll('[data-theme]').forEach((b) => b.onclick = () => appState.setTheme(b.dataset.theme));
  document.getElementById('takeSnap')?.addEventListener('click', () => { appState.pushSnap(store.clients); alert('Snapshot guardado'); location.reload(); });
  document.querySelectorAll('[data-restore]').forEach((b) => b.onclick = () => { const d = appState.restoreSnap(b.dataset.restore); if (d && confirm('¿Restaurar esta versión?')) { localStorage.setItem('brujula-clientes-v1', JSON.stringify(d)); location.reload(); } });
  document.getElementById('runExtract')?.addEventListener('click', () => {
    const txt = document.getElementById('bioInput').value; if (!txt) return;
    import('../data/team.js').then((m) => { const e = m.extractFromBio(txt); document.getElementById('extractOut').innerHTML = `<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:8px">Nombre: <b>${esc(e.name)}</b> · Tel: <b>${esc(e.phone)}</b> · Rubro: <b>${esc(e.type)}</b><div style="margin-top:4px"><button class="chip-btn" id="useExtract">Usar en formulario</button></div></div>`;
      setTimeout(() => { document.getElementById('useExtract')?.addEventListener('click', () => { window._extracted = e; document.getElementById('newClientBtn')?.click(); setTimeout(() => { const f = document.getElementById('fName'); if (f) f.value = e.name; const p = document.getElementById('fPhone'); if (p) p.value = e.phone; const t = document.getElementById('fType'); if (t) t.value = e.type; }, 200); }); }, 200);
    });
  });
  // Ctrl+K palette
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('cmdMask')?.classList.add('open'); document.getElementById('cmdInput')?.focus(); } if (e.key === 'Escape') document.getElementById('cmdMask')?.classList.remove('open'); });
  document.getElementById('cmdMask')?.addEventListener('click', (ev) => { if (ev.target.id === 'cmdMask') ev.currentTarget.classList.remove('open'); });
  const cmdInput = document.getElementById('cmdInput'); if (cmdInput) cmdInput.addEventListener('input', () => {
    const q = cmdInput.value.toLowerCase(); const list = document.getElementById('cmdList'); if (!list) return;
    const cmds = [{ label: 'Ir a Clientes', act: () => { document.querySelector('[data-page="clients"]')?.click(); } }, { label: 'Nuevo cliente', act: () => document.getElementById('newClientBtn')?.click() }, { label: 'Exportar XLSX', act: () => document.getElementById('exportXlsxBtn')?.click() }, ...store.clients.slice(0, 20).map((c) => ({ label: `Abrir ${c.name}`, act: () => { document.getElementById('cmdMask').classList.remove('open'); setTimeout(() => { window.dispatchEvent(new CustomEvent('open-client', { detail: c.id })); }, 100); } }))];
    const f = cmds.filter((c) => c.label.toLowerCase().includes(q)); list.innerHTML = f.slice(0, 8).map((c, i) => `<div class="cmd-item" data-cmd="${i}"><span>${esc(c.label)}</span><small>↵</small></div>`).join(''); list.querySelectorAll('[data-cmd]').forEach((el) => el.onclick = () => { f[Number(el.dataset.cmd)].act(); document.getElementById('cmdMask').classList.remove('open'); });
  });
}
