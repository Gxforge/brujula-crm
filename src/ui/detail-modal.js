import { $, buildWhatsAppUrl, esc, formatDate, initials, norm, openExternalUrl, showToast, statusLabel } from '../core/utils.js';
import { CURRENCIES, PROJECT_STAGES, buildProjectQuoteMessage, computeLeadScore } from '../data/project-catalog.js';

export function fillMessageTemplate(tplBody, client) {
  const cleanContact = client.contact && !/administraci|@/i.test(client.contact)
    ? client.contact.split('(')[0].trim()
    : 'equipo';
  const pending = Math.max(0, Number(client.value || 0) - Number(client.paid || 0));
  return tplBody
    .replace(/\{negocio\}/g, client.name || 'su negocio')
    .replace(/\{contacto\}/g, cleanContact)
    .replace(/\{provincia\}/g, client.province || 'Cuba')
    .replace(/\{rubro\}/g, client.type || 'su sector')
    .replace(/\{proyecto\}/g, client.desiredProject || 'su catálogo digital')
    .replace(/\{saldo\}/g, `${pending} ${client.currency || 'USD'}`);
}

export function renderClientDetailModal(store, clientId, refreshCb) {
  const c = store.getById(clientId);
  if (!c) return;
  const lead = computeLeadScore(c);
  const firstTpl = store.templates[0];
  const initialPitch = c.projects.length
    ? buildProjectQuoteMessage(c, c.projects[0])
    : (firstTpl ? fillMessageTemplate(firstTpl.body, c) : '');
  const directWa = buildWhatsAppUrl(c.phone);

  const stageOpts = (cur) => PROJECT_STAGES.filter((s) => s.id !== 'Sin proyecto')
    .map((s) => `<option value="${esc(s.id)}" ${s.id === cur ? 'selected' : ''}>${esc(s.label)}</option>`).join('');

  $('#detailContent').innerHTML = `
    <div class="detail-head">
      <div class="client-initial">${esc(initials(c.name))}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:18px">${esc(c.name)}</h3>
          <span class="score-pill ${lead.cls}">${lead.icon} ${lead.score} pts · ${lead.label}</span>
        </div>
        <p style="margin:3px 0 0;color:var(--muted);font-size:12.5px">
          ${esc(c.type || 'Sin rubro')} · ${esc(c.province || 'Sin provincia')}${c.social ? ` · <b>${esc(c.social)}</b>` : ''}
        </p>
      </div>
      <span class="badge st-${esc(c.status)}">${esc(statusLabel(c.status))}</span>
    </div>

    <div class="detail-section" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
        <small style="color:#8892a4;font-size:10.5px;display:block">Próximo seguimiento comercial</small>
        <b style="font-size:13px">${c.nextDate ? esc(formatDate(c.nextDate)) : 'Sin fecha programada'}</b>
      </div>
      <div class="quick-chips">
        <span style="font-size:11px;color:var(--muted)">Agendar en 1 clic:</span>
        <button type="button" class="chip-btn" data-qdays="0">Hoy</button>
        <button type="button" class="chip-btn" data-qdays="1">+1 día</button>
        <button type="button" class="chip-btn" data-qdays="3">+3 días</button>
        <button type="button" class="chip-btn" data-qdays="7">+7 días</button>
      </div>
    </div>

    <div class="detail-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h4 style="margin:0">Proyectos que quiso / solicitó este cliente (${c.projects.length})</h4>
        <button type="button" class="chip-btn" id="toggleAddProjBtn">+ Añadir proyecto solicitado</button>
      </div>

      ${c.projects.length ? c.projects.map((p) => {
        const pctPaid = p.price > 0 ? Math.min(100, Math.round((p.paid / p.price) * 100)) : 0;
        const pending = Math.max(0, p.price - p.paid);
        return `
        <div class="client-proj-card">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
            <div>
              <strong style="font-size:13.5px">📦 ${esc(p.title)}</strong>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px">
                Precio: <b>${p.price} ${esc(p.currency)}</b> · Abonado: <b>${p.paid} ${esc(p.currency)}</b> · Falta: <b style="color:${pending > 0 ? '#c94726' : '#0f7666'}">${pending} ${esc(p.currency)}</b>
                ${p.deadline ? ` · Entrega: ${esc(formatDate(p.deadline))}` : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <select data-pstage="${esc(p.id)}" style="height:28px;border:1px solid #cbd5e1;border-radius:7px;font-size:11.5px;padding:0 6px;background:#fff">${stageOpts(p.stage)}</select>
              <button type="button" class="chip-btn" data-quote-proj="${esc(p.id)}" title="Pasar cotización a WhatsApp">Cotizar WA</button>
              <button type="button" class="chip-btn" data-del-proj="${esc(p.id)}" style="color:#b43e44">×</button>
            </div>
          </div>
          ${p.price > 0 ? `<div class="proj-bar" title="${pctPaid}% cobrado"><i style="width:${pctPaid}%"></i></div>` : ''}
          ${p.notes ? `<div style="font-size:12px;color:#475569;margin-top:7px"><b>Pidió:</b> ${esc(p.notes)}</div>` : ''}
          ${p.checklist.length ? `<div class="checklist">${p.checklist.map((it, idx) => `
            <label><input type="checkbox" data-chk-proj="${esc(p.id)}" data-chk-idx="${idx}" ${it.done ? 'checked' : ''}><span>${esc(it.text)}</span></label>
          `).join('')}</div>` : ''}
        </div>`;
      }).join('') : `<div class="notes-box">Aún no has anotado qué proyecto quiere este cliente. Pulsa <b>"+ Añadir proyecto solicitado"</b> para asignarle un paquete o proyecto a medida.</div>`}

      <div id="inlineProjBox" class="add-proj-box" style="display:none">
        <div class="form-grid" style="gap:9px">
          <div class="field">
            <label>Elegir del catálogo (autocompleta)</label>
            <select id="ipSvcSelect">
              <option value="">-- Escribir proyecto personalizado --</option>
              ${store.services.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${s.price} ${s.currency})</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Nombre del proyecto solicitado *</label><input id="ipTitle" placeholder="Ej. Catálogo QR + Carrito" /></div>
          <div class="field"><label>Estado</label><select id="ipStage">${stageOpts('Solicitado')}</select></div>
          <div class="field"><label>Entrega estimada</label><input id="ipDeadline" type="date" /></div>
          <div class="field"><label>Precio total</label><input id="ipPrice" type="number" min="0" value="60" /></div>
          <div class="field"><label>Anticipo cobrado + Moneda</label>
            <div style="display:flex;gap:6px">
              <input id="ipPaid" type="number" min="0" value="0" placeholder="Abonado" />
              <select id="ipCurrency" style="width:92px">${CURRENCIES.map((cur) => `<option>${cur}</option>`).join('')}</select>
            </div>
          </div>
          <div class="field full"><label>¿Qué pidió exactamente el cliente? (requisitos)</label><input id="ipNotes" placeholder="Ej. Quiere fotos de combos, precios en CUP/USD y envío por municipio" /></div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:9px">
          <button type="button" class="btn btn-aqua" id="saveInlineProjBtn" style="padding:7px 13px;font-size:12px">Guardar proyecto en ficha</button>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h4>Datos de contacto y evidencia</h4>
      <div class="detail-grid">
        <div class="detail-item"><small>Contacto</small><span>${esc(c.contact || 'No especificado')}</span></div>
        <div class="detail-item"><small>Teléfono / WhatsApp</small>${directWa ? `<a href="${esc(directWa)}" target="_blank" rel="noopener"><b>${esc(c.phone)} ↗</b></a>` : `<span>${esc(c.phone || 'Sin teléfono')}</span>`}</div>
        <div class="detail-item"><small>Ubicación</small><span>${esc(c.address || c.province || 'No registrada')}</span></div>
        <div class="detail-item"><small>Perfil / Evidencia</small>${c.evidenceUrl ? `<a href="${esc(c.evidenceUrl)}" target="_blank" rel="noopener">Abrir enlace original ↗</a>` : '<span>Sin enlace</span>'}</div>
      </div>
      ${c.evidence ? `<div class="notes-box" style="margin-top:8px">${esc(c.evidence)}</div>` : ''}
    </div>

    <div class="detail-section">
      <h4>Asistente de Propuesta y Cotización por WhatsApp</h4>
      <div class="wa-composer">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
          <label style="font-size:11.5px;font-weight:800;color:#14532d">Plantilla rápida:</label>
          <select id="waTplSelect" style="height:30px;border:1px solid #a7dec0;border-radius:7px;padding:0 8px;font-size:12px;background:#fff">
            ${c.projects.length ? `<option value="quote">📋 Cotización formal del proyecto</option>` : ''}
            ${store.templates.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        <textarea id="waPitchText">${esc(initialPitch)}</textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
          <button type="button" class="btn btn-secondary" id="copyPitchBtn" style="padding:7px 11px;font-size:12px">Copiar texto</button>
          <button type="button" class="btn btn-aqua" id="sendWaAndMarkBtn" style="padding:7px 13px;font-size:12px">Enviar WhatsApp y registrar ↗</button>
        </div>
      </div>
    </div>

    ${c.notes ? `<div class="detail-section" style="padding-bottom:0"><h4>Notas privadas</h4><div class="notes-box">${esc(c.notes)}</div></div>` : ''}
  `;

  bindDetailEvents(store, c, refreshCb);
}

function bindDetailEvents(store, c, refreshCb) {
  const root = $('#detailContent');

  root.querySelectorAll('[data-qdays]').forEach((btn) => {
    btn.onclick = () => {
      const dt = store.scheduleQuickFollowup(c.id, Number(btn.dataset.qdays));
      showToast('Seguimiento agendado', `${c.name} → ${formatDate(dt)}`);
      refreshCb(c.id);
    };
  });

  $('#toggleAddProjBtn')?.addEventListener('click', () => {
    const box = $('#inlineProjBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
  });

  $('#ipSvcSelect')?.addEventListener('change', (e) => {
    const svc = store.services.find((s) => s.id === e.target.value);
    if (!svc) return;
    $('#ipTitle').value = svc.name;
    $('#ipPrice').value = svc.price;
    $('#ipCurrency').value = svc.currency;
    const d = new Date();
    d.setDate(d.getDate() + (svc.deliveryDays || 4));
    $('#ipDeadline').value = d.toISOString().slice(0, 10);
  });

  $('#saveInlineProjBtn')?.addEventListener('click', () => {
    const title = $('#ipTitle').value.trim();
    if (!title) return showToast('Falta título', 'Indica qué proyecto solicitó el cliente.', true);
    const svc = store.services.find((s) => s.id === $('#ipSvcSelect').value || norm(s.name) === norm(title));
    store.saveClientProject(c.id, {
      serviceId: svc?.id || '',
      title,
      stage: $('#ipStage').value,
      price: Number($('#ipPrice').value || 0),
      paid: Number($('#ipPaid').value || 0),
      currency: $('#ipCurrency').value,
      deadline: $('#ipDeadline').value,
      notes: $('#ipNotes').value.trim()
    });
    showToast('Proyecto asignado', title);
    refreshCb(c.id);
  });

  root.querySelectorAll('[data-pstage]').forEach((sel) => {
    sel.onchange = () => {
      const p = c.projects.find((x) => x.id === sel.dataset.pstage);
      if (p) { store.saveClientProject(c.id, { ...p, stage: sel.value }); refreshCb(c.id); }
    };
  });

  root.querySelectorAll('[data-chk-proj]').forEach((chk) => {
    chk.onchange = () => store.toggleProjectChecklist(c.id, chk.dataset.chkProj, Number(chk.dataset.chkIdx));
  });

  root.querySelectorAll('[data-quote-proj]').forEach((btn) => {
    btn.onclick = () => {
      const p = c.projects.find((x) => x.id === btn.dataset.quoteProj);
      if (p) { $('#waPitchText').value = buildProjectQuoteMessage(c, p); $('#waPitchText').focus(); }
    };
  });

  root.querySelectorAll('[data-del-proj]').forEach((btn) => {
    btn.onclick = () => { store.removeClientProject(c.id, btn.dataset.delProj); refreshCb(c.id); };
  });

  $('#waTplSelect')?.addEventListener('change', (e) => {
    if (e.target.value === 'quote' && c.projects[0]) {
      $('#waPitchText').value = buildProjectQuoteMessage(c, c.projects[0]);
    } else {
      const tpl = store.templates[Number(e.target.value)];
      if (tpl) $('#waPitchText').value = fillMessageTemplate(tpl.body, c);
    }
  });

  $('#copyPitchBtn')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText($('#waPitchText').value);
    showToast('Texto copiado', 'Listo para pegar en WhatsApp o Instagram.');
  });

  $('#sendWaAndMarkBtn')?.addEventListener('click', () => {
    const url = buildWhatsAppUrl(c.phone, $('#waPitchText').value.trim());
    if (!url) return showToast('Sin teléfono', 'Añade un número válido para WhatsApp.', true);
    openExternalUrl(url);
    if (c.status === 'Pendiente') store.updateStatus(c.id, 'Contactado', 'Propuesta enviada por WhatsApp.');
    refreshCb(c.id);
  });
}
