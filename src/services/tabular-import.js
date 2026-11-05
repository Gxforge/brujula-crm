import { norm, normalizeStatus } from '../core/utils.js';
import { parseXlsxFile } from './xlsx-parser.js';

export const IMPORT_FIELDS = [
  { key: 'name', label: 'Nombre del Negocio *', required: true, hints: ['nombredelnegocio', 'negocio', 'empresa', 'cliente', 'comercio', 'tienda', 'local', 'nombre', 'name'] },
  { key: 'province', label: 'Provincia', hints: ['provincia', 'estado', 'region', 'ciudad'] },
  { key: 'address', label: 'Municipio / Dirección', hints: ['municipio', 'direccion', 'ubicacion', 'zona', 'calle', 'domicilio'] },
  { key: 'type', label: 'Rubro / Categoría', hints: ['rubro', 'tipo', 'categoria', 'giro', 'sector', 'actividad'] },
  { key: 'contact', label: 'Persona / Contacto', hints: ['contacto', 'persona', 'dueno', 'propietario', 'encargado', 'correo', 'email'] },
  { key: 'phone', label: 'Teléfono / WhatsApp', hints: ['telefono', 'whatsapp', 'celular', 'movil', 'numero', 'tel', 'fono'] },
  { key: 'social', label: 'Red Social', hints: ['redsocial', 'plataforma', 'canal', 'red', 'origen'] },
  { key: 'evidenceUrl', label: 'Enlace Perfil / Post', hints: ['linkdeevidencia', 'enlacedeevidencia', 'link', 'enlace', 'url', 'perfil', 'evidenciafb'] },
  { key: 'evidence', label: 'Evidencia / Descripción', hints: ['evidenciadetectada', 'evidencia', 'publicacion', 'bio', 'motivo', 'detalle', 'observacion'] },
  { key: 'catalogCheck', label: 'Filtro Catálogo (El Yerro)', hints: ['filtroelyerromenu', 'yerromenu', 'yerro', 'filtro'] },
  { key: 'desiredProject', label: 'Proyecto Solicitado', hints: ['proyectosolicitado', 'proyecto', 'servicio', 'paquete', 'productointeres'] },
  { key: 'value', label: 'Presupuesto / Valor', hints: ['presupuestototal', 'presupuesto', 'precio', 'valor', 'inversion', 'monto'] },
  { key: 'paid', label: 'Abonado / Anticipo', hints: ['abonado', 'anticipo', 'pagado', 'cobrado'] },
  { key: 'requirements', label: 'Requisitos del Proyecto', hints: ['requisitosdelproyecto', 'requisitos', 'alcance', 'requerimientos'] },
  { key: 'status', label: 'Estado de Gestión', hints: ['estadodegestion', 'estadogestion', 'etapa', 'estatus'] },
  { key: 'notes', label: 'Notas Privadas', hints: ['notasprivadas', 'notas', 'comentarios', 'seguimiento'] }
];

export function cellText(cell) {
  if (cell == null) return '';
  if (typeof cell === 'object') return String(cell.value ?? '').trim();
  return String(cell).trim();
}

export function cellHref(cell) {
  if (cell && typeof cell === 'object') return String(cell.href || '').trim();
  return '';
}

function detectDelimiter(sampleText) {
  const firstLines = sampleText.split(/\r?\n/).slice(0, 6).join('\n');
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestScore = -1;
  for (const delim of candidates) {
    const count = firstLines.split(delim).length - 1;
    if (count > bestScore) {
      bestScore = count;
      best = delim;
    }
  }
  return best;
}

export function parseDelimitedText(rawText) {
  const text = String(rawText || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  // Si es una tabla Markdown pegada (| Col1 | Col2 |), limpia bordes y separadores :---
  const lines = text.split(/\r?\n/);
  const looksMarkdown = lines.length >= 2 && lines[0].includes('|') && /^\s*\|?[\s:-]+\|/.test(lines[1] || '');
  if (looksMarkdown) {
    return lines
      .filter((ln, idx) => idx !== 1 && ln.trim())
      .map((ln) =>
        ln.trim().replace(/^\||\|$/g, '').split('|').map((v) => ({ value: v.trim(), href: '' }))
      );
  }

  const delim = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === delim && !quoted) {
      row.push({ value: cell.trim(), href: '' });
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push({ value: cell.trim(), href: '' });
      if (row.some((c) => c.value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push({ value: cell.trim(), href: '' });
  if (row.some((c) => c.value !== '')) rows.push(row);
  return rows;
}

export function detectHeaderRowIndex(rows) {
  const allHints = IMPORT_FIELDS.flatMap((f) => f.hints);
  let bestIdx = 0;
  let bestHits = -1;
  const limit = Math.min(rows.length, 10);

  for (let r = 0; r < limit; r++) {
    const row = rows[r] || [];
    let hits = 0;
    row.forEach((c) => {
      const k = norm(cellText(c));
      if (k && allHints.some((h) => k.includes(h))) hits++;
    });
    if (hits > bestHits) {
      bestHits = hits;
      bestIdx = r;
    }
  }
  return bestIdx;
}

export function guessColumnMapping(headerRow) {
  const normalized = (headerRow || []).map((c) => norm(cellText(c)));
  const usedCols = new Set();
  const mapping = {};

  IMPORT_FIELDS.forEach((field) => {
    let found = -1;
    // Primero coincidencia exacta
    for (const hint of field.hints) {
      const idx = normalized.findIndex((h, i) => !usedCols.has(i) && h === hint);
      if (idx >= 0) {
        found = idx;
        break;
      }
    }
    // Luego coincidencia parcial
    if (found < 0) {
      for (const hint of field.hints) {
        const idx = normalized.findIndex((h, i) => !usedCols.has(i) && h && h.includes(hint));
        if (idx >= 0) {
          found = idx;
          break;
        }
      }
    }
    if (found >= 0) {
      usedCols.add(found);
      mapping[field.key] = found;
    } else {
      mapping[field.key] = -1;
    }
  });

  // Fallback seguro: si ninguna columna coincidió con "Nombre del Negocio", elige la primera columna de texto no numérica
  if (mapping.name < 0 && normalized.length > 0) {
    const firstAvailable = normalized.findIndex((h, i) => !usedCols.has(i) && h && h !== 'id' && h !== 'no' && h !== 'n');
    mapping.name = firstAvailable >= 0 ? firstAvailable : 0;
  }

  return mapping;
}

export function buildRecordsFromSheet(rows, headerRowIdx, mapping) {
  if (!rows || rows.length <= headerRowIdx + 1) return [];
  const dataRows = rows.slice(headerRowIdx + 1);

  return dataRows
    .map((row) => {
      const getVal = (key) => {
        const col = mapping[key];
        return col >= 0 ? cellText(row[col]) : '';
      };
      const getLink = (key) => {
        const col = mapping[key];
        return col >= 0 ? cellHref(row[col]) : '';
      };

      const rawUrl = getLink('evidenceUrl') || getVal('evidenceUrl') || getLink('social');
      const cleanUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '';

      return {
        name: getVal('name'),
        province: getVal('province'),
        address: getVal('address'),
        type: getVal('type'),
        contact: getVal('contact'),
        phone: getVal('phone'),
        social: getVal('social'),
        evidenceUrl: cleanUrl,
        evidence: getVal('evidence'),
        catalogCheck: getVal('catalogCheck') || 'NO está (Verificado)',
        desiredProject: getVal('desiredProject'),
        value: Number(String(getVal('value')).replace(/[^0-9.]/g, '')) || 0,
        paid: Number(String(getVal('paid')).replace(/[^0-9.]/g, '')) || 0,
        requirements: getVal('requirements'),
        status: normalizeStatus(getVal('status')),
        notes: getVal('notes')
      };
    })
    .filter((rec) => rec.name && norm(rec.name) !== 'nombredelnegocio');
}

export async function parseAnyImportFile(file) {
  const name = file.name || 'archivo';
  if (/\.json$/i.test(name)) {
    const parsed = JSON.parse(await file.text());
    const arr = Array.isArray(parsed) ? parsed : parsed.clients;
    if (!Array.isArray(arr)) throw new Error('El JSON no contiene una lista de clientes.');
    const headers = IMPORT_FIELDS.map((f) => ({ value: f.label, href: '' }));
    const rows = [
      headers,
      ...arr.map((c) => IMPORT_FIELDS.map((f) => ({ value: String(c[f.key] ?? ''), href: '' })))
    ];
    return [{ name: 'Respaldo JSON', rows }];
  }

  if (/\.(csv|tsv|txt)$/i.test(name)) {
    const rows = parseDelimitedText(await file.text());
    if (!rows.length) throw new Error('El archivo CSV/texto está vacío.');
    return [{ name: 'Tabla CSV', rows }];
  }

  const sheets = await parseXlsxFile(file);
  if (!sheets.length) {
    throw new Error('No se encontraron hojas con datos en el archivo Excel.');
  }
  return sheets;
}
