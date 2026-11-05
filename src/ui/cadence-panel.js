import { esc, buildWhatsAppUrl, openExternalUrl } from '../core/utils.js';
import { CADENCE_STEPS, DEMO_PRESETS, BATTLECARDS, isGoingCold, burstQueue } from '../data/cadence.js';
import { setCadenceStep } from '../core/ops.js';

export function cadenceHTML(client) {
  const step = client.cadence?.step || 1;
  return `<div class="extra-box"><b> Secuencia comercial guiada</b><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${CADENCE_STEPS.map((s) => `<button class="chip-btn" data-cad-step="${esc(client.id)}::${s.step}" style="${s.step === step ? 'background:#0ea5e9;color:#fff;border-color:#0ea5e9' : ''}">${s.step} · ${esc(s.label.split(':')[0])}</button>`).join('')}</div><div style="font-size:11px;color:var(--mut);margin-top:4px">Paso actual: <b>${esc(CADENCE_STEPS[step - 1]?.label || '')}</b> · ${esc(CADENCE_STEPS[step - 1]?.tip || '')}</div></div>`;
}
export function coldBadge(client) {
  const d = isGoingCold(client); return d ? `<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:700">⚠️ Se enfría (${d}d)</span>` : '';
}
export function renderBurstUI(store, handlers) {
  const q = burstQueue(store.clients);
  if (!q.length) return `<div style="padding:12px;font-size:12px;color:#94a3b8">Sin cola pendiente. ¡Buen trabajo!</div>`;
  return `<div class="burst-mask" id="burstMask"><div class="burst-card">
    <div style="display:flex;justify-content:space-between;align-items:center"><b> Modo Ráfaga (${q.length})</b><button class="close-btn" id="closeBurst">×</button></div>
    <div id="burstProgress" style="margin:8px 0;font-size:11px;color:#64748b">1/${q.length}</div>
    <div id="burstCard" style="border:1px solid #e2e8f0;border-radius:10px;padding:12px"></div>
    <div style="display:flex;gap:6px;margin-top:10px"><button class="btn btn-aqua" id="burstWa">Enviar WA ↗</button><button class="btn btn-secondary" id="burstSkip">Saltar</button><button class="btn btn-primary" id="burstDone">Marcar contactado</button></div>
  </div></div>`;
}
export function bindCadence(store, client, refresh) {
  const root = document.getElementById('detailContent'); if (!root) return;
  root.querySelectorAll('[data-cad-step]').forEach((b) => b.onclick = () => { const [cid, st] = b.dataset.cadStep.split('::'); setCadenceStep(store, cid, Number(st)); refresh(cid); });
  root.querySelectorAll('[data-demo-insert]').forEach((b) => b.onclick = () => {
    const demo = DEMO_PRESETS[b.dataset.demoInsert] || DEMO_PRESETS.default;
    const ta = document.getElementById('waPitchText'); if (ta) ta.value += `\n🔗 Demo: ${demo}`;
  });
  root.querySelectorAll('[data-battle]').forEach((b) => b.onclick = () => {
    const card = BATTLECARDS.find((x) => x.id === b.dataset.battle); if (!card) return; const ta = document.getElementById('waPitchText'); if (ta) ta.value = card.reply;
  });
}
export function battleHTML() {
  return `<div class="extra-box"><b> Respuestas anti-objeciones</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${BATTLECARDS.map((c) => `<button class="chip-btn" data-battle="${c.id}">${esc(c.label)}</button>`).join('')}</div></div>`;
}
export function initBurst(store, handlers) {
  const mask = document.getElementById('burstMask'); if (!mask) return; let idx = 0; const q = burstQueue(store.clients);
  const show = () => {
    const c = q[idx]; if (!c) { mask.classList.remove('open'); return; }
    document.getElementById('burstProgress').textContent = `${idx + 1}/${q.length}`;
    document.getElementById('burstCard').innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div class="client-initial">${c.name.slice(0, 2).toUpperCase()}</div><div><b>${esc(c.name)}</b> · ${esc(c.province || '')}<div style="font-size:11px;color:#64748b">${esc(c.projects?.[0]?.title || c.desiredProject || '')} · ${esc(c.phone)}</div></div></div>`;
    document.getElementById('burstWa').onclick = () => {
      const url = buildWhatsAppUrl(c.phone, `¡Hola ${c.contact || 'equipo'}! ¿Viste la demo de ${c.projects?.[0]?.title || 'tu proyecto'} para ${c.name}?`); if (url) openExternalUrl(url);
    };
    document.getElementById('burstSkip').onclick = () => { idx++; show(); };
    document.getElementById('burstDone').onclick = () => { store.updateStatus(c.id, 'Contactado'); idx++; handlers.openDetail && showToast && showToast('Marcado', c.name); show(); };
  };
  document.getElementById('closeBurst')?.addEventListener('click', () => mask.classList.remove('open'));
  show();
}
function showToast(t, m) { const el = document.getElementById('toast'); if (!el) return; el.className = 'toast show'; el.innerHTML = `<b>${t}</b>${m || ''}`; setTimeout(() => el.className = 'toast', 2800); }
