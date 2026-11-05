import { esc, formatDate, showToast } from '../core/utils.js';
import { onboardingPct, hourlyRate } from '../data/production.js';
import { buildTieredQuoteMessage } from '../data/project-catalog.js';

export function renderOnboardingHTML(p) {
  const pct = onboardingPct(p.onboarding);
  return `<div class="extra-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <b style="font-size:12px">📥 Insumos del cliente — ${pct}% recibido</b><span style="font-size:11px;color:${pct === 100 ? '#0f7666' : '#8a6e00'}">${p.onboarding.filter((i) => i.done).length}/${p.onboarding.length}</span>
    </div>
    <div class="proj-bar" style="margin:0 0 8px"><i style="width:${pct}% ; background:${pct === 100 ? '#18a390' : '#eebd48'}"></i></div>
    <div class="checklist">${p.onboarding.map((it, idx) => `<label><input type="checkbox" data-ob-proj="${esc(p.id)}" data-ob-idx="${idx}" ${it.done ? 'checked' : ''}><span>${esc(it.text)}</span></label>`).join('')}</div>
  </div>`;
}

export function renderTiersHTML(c, p) {
  return `<div class="extra-box tier-box">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <b style="font-size:12px">💎 Cotización en 3 niveles (Básico / Pro / Completo)</b>
      <button type="button" class="chip-btn" data-tier-wa="${esc(p.id)}">Enviar 3 opciones por WA</button>
    </div>
    <div class="tier-grid">${p.quoteTiers.map((t) => `<div class="tier-card ${t.id === 'pro' ? 'featured' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(t.name)}</b><span style="font-weight:800">${t.price} ${esc(t.currency)}</span></div>
      <div style="font-size:11px;color:var(--muted)">⏱ ${t.days} días</div>
      <ul style="margin:6px 0 6px 16px;font-size:11.5px">${t.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <input data-tier-price="${esc(p.id)}::${esc(t.id)}" type="number" value="${t.price}" style="width:78px;height:26px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px;font-size:11.5px" title="Precio editable">
        <input data-tier-days="${esc(p.id)}::${esc(t.id)}" type="number" value="${t.days}" style="width:58px;height:26px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px;font-size:11.5px" title="Días">
      </div>
      ${t.pitch ? `<div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic">${esc(t.pitch)}</div>` : ''}
    </div>`).join('')}</div>
  </div>`;
}

export function renderRevisionsHTML(p) {
  const over = p.revisionsUsed > p.revisionsIncluded;
  return `<div class="extra-box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <div><b style="font-size:12px">🔄 Rondas de cambios</b><div style="font-size:11px;color:var(--muted)">Revisiones incluidas configurables por proyecto</div></div>
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-weight:800;padding:4px 8px;border-radius:7px;background:${over ? '#fdebe5' : '#eef4ff'};color:${over ? '#c94726' : '#2d559e'};font-size:12px">${p.revisionsUsed} / ${p.revisionsIncluded} usadas</span>
      <button type="button" class="chip-btn" data-rev-delta="${esc(p.id)}::1">+1 uso</button>
      <button type="button" class="chip-btn" data-rev-delta="${esc(p.id)}::-1">-1</button>
      <label style="font-size:11px">Incluidas:<input data-rev-inc="${esc(p.id)}" type="number" min="0" value="${p.revisionsIncluded}" style="width:44px;height:26px;border:1px solid #cbd5e1;border-radius:6px;margin-left:4px;padding:0 4px"></label>
    </div>
    ${over ? '<div style="font-size:11px;color:#c94726;font-weight:700;width:100%">⚠️ Límite superado — sugiere cobrar extra (Add-on).</div>' : ''}
  </div>`;
}

export function renderVaultHTML(p) {
  const v = p.vault || {};
  return `<details class="extra-box vault-box"><summary style="cursor:pointer;font-weight:800;font-size:12.5px">🔐 Bóveda técnica del proyecto ${v.url ? '· vinculado' : '· pendiente'}</summary>
    <div class="vault-grid">
      <label>URL publicada<input data-vault-field="${esc(p.id)}::url" value="${esc(v.url)}" placeholder="https://..." ></label>
      <label>Dominio<input data-vault-field="${esc(p.id)}::domain" value="${esc(v.domain)}" placeholder="ej. pizzeriasol.com"></label>
      <label>Hosting / Servidor<input data-vault-field="${esc(p.id)}::hosting" value="${esc(v.hosting)}" placeholder="Netlify / Hostinger / Cloudflare"></label>
      <label>Repositorio<input data-vault-field="${esc(p.id)}::repo" value="${esc(v.repo)}" placeholder="GitHub / Drive link"></label>
      <label>Vencimiento<input data-vault-field="${esc(p.id)}::expiresAt" type="date" value="${esc(v.expiresAt)}"></label>
      <label style="grid-column:1/-1">Notas técnicas<textarea data-vault-field="${esc(p.id)}::notes" placeholder="Accesos, claves, instrucciones..." style="min-height:46px">${esc(v.notes)}</textarea></label>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
      ${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener" class="chip-btn" style="text-decoration:none">Abrir URL ↗</a><button type="button" class="chip-btn" data-qr="${esc(v.url)}">QR del enlace</button>` : '<span style="font-size:11px;color:#94a3b8">Añade la URL para activar el QR imprimible.</span>'}
      <button type="button" class="btn btn-aqua" data-vault-save="${esc(p.id)}" style="padding:6px 10px;font-size:11.5px;margin-left:auto">Guardar bóveda</button>
    </div>
    <div data-qr-box="${esc(p.id)}" style="margin-top:8px"></div>
  </details>`;
}

export function renderHoursHTML(p) {
  const rate = hourlyRate(p.price, p.hoursLogged);
  return `<div class="extra-box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <div><b style="font-size:12px">⏱ Horas y rentabilidad</b><div style="font-size:11px;color:var(--muted)">${p.hoursLogged} h registradas · <b style="color:${rate >= 15 ? '#0f7666' : rate > 0 ? '#8a6e00' : '#94a3b8'}">${rate ? rate + ' ' + esc(p.currency) + '/h' : 'Calcula al añadir horas'}</b></div></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <button type="button" class="chip-btn" data-hours="${esc(p.id)}::0.5">+0.5h</button>
      <button type="button" class="chip-btn" data-hours="${esc(p.id)}::1">+1h</button>
      <button type="button" class="chip-btn" data-hours="${esc(p.id)}::2">+2h</button>
      <input data-hours-custom="${esc(p.id)}" type="number" step="0.5" placeholder="h" style="width:54px;height:26px;border:1px solid #cbd5e1;border-radius:6px;padding:0 6px;font-size:11.5px">
      <button type="button" class="chip-btn" data-hours-add="${esc(p.id)}">Añadir</button>
    </div>
  </div>`;
}

export function bindExtras(store, c, refresh) {
  const root = document.getElementById('detailContent');
  if (!root) return;
  root.querySelectorAll('[data-ob-proj]').forEach((chk) => {
    chk.onchange = () => { store.toggleOnboarding(c.id, chk.dataset.obProj, Number(chk.dataset.obIdx)); refresh(c.id); };
  });
  root.querySelectorAll('[data-tier-wa]').forEach((btn) => {
    btn.onclick = () => {
      const p = c.projects.find((x) => x.id === btn.dataset.tierWa); if (!p) return;
      const box = document.getElementById('waPitchText'); if (box) box.value = buildTieredQuoteMessage(c, p);
      showToast('Propuesta 3 niveles lista', 'Revisa el compositor de WhatsApp abajo.');
      document.getElementById('waPitchText')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  });
  root.querySelectorAll('[data-tier-price]').forEach((inp) => {
    inp.onchange = () => {
      const [pid, tid] = inp.dataset.tierPrice.split('::'); const p = c.projects.find((x) => x.id === pid); if (!p) return;
      const t = p.quoteTiers.find((x) => x.id === tid); if (t) t.price = Number(inp.value || 0); store.saveTiers(c.id, pid, p.quoteTiers);
    };
  });
  root.querySelectorAll('[data-tier-days]').forEach((inp) => {
    inp.onchange = () => {
      const [pid, tid] = inp.dataset.tierDays.split('::'); const p = c.projects.find((x) => x.id === pid); if (!p) return;
      const t = p.quoteTiers.find((x) => x.id === tid); if (t) t.days = Number(inp.value || 1); store.saveTiers(c.id, pid, p.quoteTiers);
    };
  });
  root.querySelectorAll('[data-rev-delta]').forEach((btn) => {
    btn.onclick = () => { const [pid, d] = btn.dataset.revDelta.split('::'); store.setRevisions(c.id, pid, { delta: Number(d) }); refresh(c.id); };
  });
  root.querySelectorAll('[data-rev-inc]').forEach((inp) => {
    inp.onchange = () => store.setRevisions(c.id, inp.dataset.revInc, { included: Number(inp.value) });
  });
  root.querySelectorAll('[data-hours]').forEach((btn) => {
    btn.onclick = () => { store.addHours(c.id, btn.dataset.hours.split('::')[0], Number(btn.dataset.hours.split('::')[1])); refresh(c.id); };
  });
  root.querySelectorAll('[data-hours-add]').forEach((btn) => {
    btn.onclick = () => {
      const inp = root.querySelector(`[data-hours-custom="${btn.dataset.hoursAdd}"]`); const v = Number(inp?.value || 0);
      if (!v) return showToast('Indica horas', 'Ej. 1.5', true); store.addHours(c.id, btn.dataset.hoursAdd, v); refresh(c.id);
    };
  });
  root.querySelectorAll('[data-vault-save]').forEach((btn) => {
    btn.onclick = () => {
      const fields = root.querySelectorAll(`[data-vault-field^="${btn.dataset.vaultSave}::"]`);
      const patch = {}; fields.forEach((f) => { const k = f.dataset.vaultField.split('::')[1]; patch[k] = f.value.trim(); });
      store.updateVault(c.id, btn.dataset.vaultSave, patch); showToast('Bóveda guardada', 'Datos técnicos actualizados.');
    };
  });
  root.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.onclick = () => {
      const pid = c.projects.find((p) => p.vault?.url === btn.dataset.qr)?.id || '';
      const box = root.querySelector(`[data-qr-box="${pid}"]`); if (!box) return;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(btn.dataset.qr)}`;
      box.innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><img src="${url}" alt="QR" style="width:120px;height:120px;border:1px solid #e2e8f0;border-radius:8px"><a href="${url}" download target="_blank" class="chip-btn" style="text-decoration:none">Descargar QR</a><span style="font-size:11px;color:var(--muted)">Imprime este QR para mesas, flyers o tarjetas.</span></div>`;
    };
  });
}
