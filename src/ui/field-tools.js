import { esc } from '../core/utils.js';
import { appState } from '../core/app-state.js';

export function initFieldTools(store, handlers) {
  // M22 FAB
  let fab = document.getElementById('fabCapture'); if (!fab) {
    fab = document.createElement('button'); fab.id = 'fabCapture'; fab.className = 'fab'; fab.innerHTML = '+'; fab.title = 'Captura relámpago 15s (M22)';
    document.body.appendChild(fab); fab.onclick = () => document.getElementById('formLayer')?.classList.add('open');
  }
  // M24 QR fullscreen
  let qrFull = document.getElementById('qrFull'); if (!qrFull) {
    qrFull = document.createElement('div'); qrFull.id = 'qrFull'; qrFull.className = 'qr-full';
    document.body.appendChild(qrFull);
  }
  const showQR = () => {
    const url = appState.profile.portfolioUrl || 'https://ejemplo.com/portfolio';
    qrFull.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}" style="width:260px;height:260px;border:1px solid #e2e8f0;border-radius:12px"><h3 style="margin:10px 0 4px">Escanea mi portafolio</h3><p style="font-size:12px;color:#64748b">${esc(url)}</p><button class="btn btn-secondary" id="closeQr">Cerrar</button>`;
    qrFull.classList.add('open'); document.getElementById('closeQr').onclick = () => qrFull.classList.remove('open');
  };
  document.getElementById('btnQrPresent')?.addEventListener('click', showQR);
  // M25 voice
  document.getElementById('btnVoice')?.addEventListener('click', () => {
    const ta = document.getElementById('fNotes'); if (!ta) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return alert('Voz no soportada en este navegador.');
    const rec = new SR(); rec.lang = 'es-ES'; rec.onresult = (e) => { ta.value += ' ' + e.results[0][0].transcript; }; rec.start();
  });
  // M26 reminders check daily
  if (appState.notif.enabled && 'Notification' in window && Notification.permission === 'granted') {
    setTimeout(() => { import('../core/ops.js').then((m) => m.triggerReminderCheck(store, appState)); }, 2000);
  }
}
export function routeGroupHTML(clients) {
  const groups = {}; clients.forEach((c) => { const k = c.address || c.province || 'Sin zona'; if (!groups[k]) groups[k] = []; groups[k].push(c); });
  return Object.entries(groups).slice(0, 12).map(([zone, list]) => `<div style="padding:8px;border:1px solid var(--line);border-radius:8px;margin-bottom:6px"><b style="font-size:12px">📍 ${esc(zone)} · ${list.length}</b><div style="font-size:11px;color:var(--mut)">${list.slice(0, 3).map((c) => esc(c.name)).join(' · ')}${list.length > 3 ? '…' : ''}</div></div>`).join('');
}
