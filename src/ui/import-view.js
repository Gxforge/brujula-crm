import { $, esc, norm, showToast } from '../core/utils.js';
import {
  IMPORT_FIELDS,
  buildRecordsFromSheet,
  cellText,
  detectHeaderRowIndex,
  guessColumnMapping,
  parseAnyImportFile,
  parseDelimitedText
} from '../services/tabular-import.js';

export class ImportView {
  constructor(store, handlers) {
    this.store = store;
    this.handlers = handlers;
    this.sheets = [];
    this.activeSheetIdx = 0;
    this.headerRowIdx = 0;
    this.mapping = {};
    this.sourceLabel = 'Tabla importada';
    this.bindEvents();
  }

  bindEvents() {
    const fileInput = $('#fileInput');
    const dz = $('#dropzone');

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await this.handleFile(file);
      fileInput.value = '';
    });

    if (dz) {
      ['dragenter', 'dragover'].forEach((ev) =>
        dz.addEventListener(ev, (e) => {
          e.preventDefault();
          dz.classList.add('drag');
        })
      );
      ['dragleave', 'drop'].forEach((ev) =>
        dz.addEventListener(ev, (e) => {
          e.preventDefault();
          dz.classList.remove('drag');
        })
      );
      dz.addEventListener('drop', async (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) await this.handleFile(file);
      });
    }

    $('#parsePasteBtn')?.addEventListener('click', () => {
      const raw = $('#pasteTextarea')?.value || '';
      const rows = parseDelimitedText(raw);
      if (rows.length < 2) {
        this.setBanner('err', 'Texto insuficiente', 'Pega al menos una fila de encabezados y una fila de datos (desde Excel, CSV o tabla Markdown).');
        showToast('Revisa el texto pegado', 'Se necesitan al menos 2 filas.', true);
        return;
      }
      this.sourceLabel = 'Tabla pegada';
      this.loadSheetsIntoMapper([{ name: 'Datos pegados', rows }], false);
    });


  }

  setBanner(type, title, detail) {
    const box = $('#importBanner');
    if (!box) return;
    box.className = `status-banner show ${type}`;
    box.innerHTML = `<div><strong>${esc(title)}</strong><div style="margin-top:2px">${esc(detail)}</div></div>`;
  }

  async handleFile(file) {
    try {
      this.setBanner('ok', `Leyendo "${file.name}"...`, 'Analizando hojas y encabezados de forma automática.');
      this.sourceLabel = file.name;
      const sheets = await parseAnyImportFile(file);

      // Buscar primero si alguna hoja tiene encabezados claros de prospectos
      let preferredIdx = 0;
      let strongMatch = false;
      sheets.forEach((sh, idx) => {
        const hIdx = detectHeaderRowIndex(sh.rows);
        const headersNorm = (sh.rows[hIdx] || []).map((c) => norm(cellText(c)));
        const hasBusiness = headersNorm.some((h) => ['nombredelnegocio', 'negocio', 'cliente', 'empresa'].some((k) => h.includes(k)));
        if (hasBusiness && !strongMatch) {
          preferredIdx = idx;
          strongMatch = true;
        }
      });

      this.loadSheetsIntoMapper(sheets, strongMatch, preferredIdx);
    } catch (err) {
      console.error('Error en importación:', err);
      this.setBanner('err', 'No pudimos leer este archivo', err.message || 'Verifica que sea un .xlsx, .csv o .json válido.');
      showToast('Error al leer archivo', err.message || 'Formato inválido', true);
    }
  }

  loadSheetsIntoMapper(sheets, autoCommit = false, startSheetIdx = 0) {
    this.sheets = sheets;
    this.selectSheet(startSheetIdx);

    if (autoCommit) {
      const records = this.buildCurrentRecords();
      if (records.length > 0) {
        const { added, updated } = this.store.importBatch(records, this.sourceLabel);
        this.setBanner(
          'ok',
          `¡Importación exitosa desde "${this.sheets[this.activeSheetIdx].name}"!`,
          `${added} clientes nuevos añadidos y ${updated} actualizados. Si el archivo tiene más hojas o quieres ajustar columnas, usa el mapeador debajo.`
        );
        showToast('Tabla importada con éxito', `${added} añadidos · ${updated} actualizados`);
        this.renderMapperUI();
        return;
      }
    }

    this.setBanner(
      'ok',
      'Archivo leído correctamente · Revisa las columnas',
      'Verifica qué columna corresponde a cada campo y pulsa "Confirmar e importar registros".'
    );
    this.renderMapperUI();
  }

  selectSheet(idx) {
    this.activeSheetIdx = Math.max(0, Math.min(idx, this.sheets.length - 1));
    const sheet = this.sheets[this.activeSheetIdx];
    this.headerRowIdx = detectHeaderRowIndex(sheet.rows);
    this.mapping = guessColumnMapping(sheet.rows[this.headerRowIdx] || []);
  }

  buildCurrentRecords() {
    const sheet = this.sheets[this.activeSheetIdx];
    if (!sheet) return [];
    return buildRecordsFromSheet(sheet.rows, this.headerRowIdx, this.mapping);
  }

  renderMapperUI() {
    const host = $('#mapperContainer');
    const sheet = this.sheets[this.activeSheetIdx];
    if (!host || !sheet) return;

    const headerRow = sheet.rows[this.headerRowIdx] || [];
    const maxCols = Math.max(headerRow.length, ...sheet.rows.slice(0, 6).map((r) => r.length));
    const colOptions = Array.from({ length: maxCols }, (_, i) => {
      const label = cellText(headerRow[i]) || `Columna ${i + 1}`;
      return { index: i, label };
    });

    const previewRecords = this.buildCurrentRecords();

    host.style.display = 'block';
    host.innerHTML = `
      <div class="panel mapper-panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <h3 style="margin:0;font-size:15px">Mapeador de Hojas y Columnas</h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--muted)">
              Detectadas <b>${previewRecords.length}</b> filas válidas en la hoja seleccionada (encabezado en fila ${this.headerRowIdx + 1}).
            </p>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${this.sheets.length > 1 ? `
              <select id="mapperSheetSelect" style="height:36px;border:1px solid var(--line-strong);border-radius:8px;padding:0 10px;font-size:12px">
                ${this.sheets.map((s, idx) => `<option value="${idx}" ${idx === this.activeSheetIdx ? 'selected' : ''}>Hoja: ${esc(s.name)} (${s.rows.length - 1} filas)</option>`).join('')}
              </select>
            ` : ''}
            <button type="button" class="btn btn-primary" id="confirmMapperImport">
              Confirmar e importar (${previewRecords.length})
            </button>
            <button type="button" class="btn btn-secondary" id="goClientsAfterImport">Ir a Clientes →</button>
          </div>
        </div>

        <div class="mapper-grid">
          ${IMPORT_FIELDS.map((f) => `
            <div class="mapper-item">
              <label>${esc(f.label)}</label>
              <select data-map-field="${esc(f.key)}">
                <option value="-1">— No importar —</option>
                ${colOptions.map((opt) => `<option value="${opt.index}" ${this.mapping[f.key] === opt.index ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>

        <div class="table-wrap" style="border:1px solid var(--line);border-radius:10px">
          <table style="min-width:680px">
            <thead>
              <tr><th>Vista previa (primeros 4)</th><th>Provincia</th><th>Contacto</th><th>Teléfono</th><th>Estado</th></tr>
            </thead>
            <tbody>
              ${previewRecords.slice(0, 4).map((r) => `
                <tr>
                  <td><b>${esc(r.name)}</b><div class="client-sub">${esc(r.type || '')}</div></td>
                  <td>${esc(r.province || '—')}</td>
                  <td>${esc(r.contact || '—')}</td>
                  <td>${esc(r.phone || '—')}</td>
                  <td><span class="badge st-${esc(r.status)}">${esc(r.status)}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Selecciona la columna "Nombre del Negocio" para previsualizar.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    $('#mapperSheetSelect', host)?.addEventListener('change', (e) => {
      this.selectSheet(Number(e.target.value));
      this.renderMapperUI();
    });

    host.querySelectorAll('[data-map-field]').forEach((sel) => {
      sel.addEventListener('change', () => {
        this.mapping[sel.dataset.mapField] = Number(sel.value);
        this.renderMapperUI();
      });
    });

    $('#confirmMapperImport', host)?.addEventListener('click', () => {
      const recs = this.buildCurrentRecords();
      if (!recs.length) {
        showToast('Sin registros válidos', 'Elige al menos la columna Nombre del Negocio.', true);
        return;
      }
      const { added, updated } = this.store.importBatch(recs, `${this.sourceLabel} (${sheet.name})`);
      showToast('Importación aplicada', `${added} añadidos · ${updated} actualizados`);
      this.handlers.goto('clients');
    });

    $('#goClientsAfterImport', host)?.addEventListener('click', () => this.handlers.goto('clients'));
  }
}
