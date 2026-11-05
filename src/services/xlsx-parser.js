// Lector nativo .xlsx / .xlsm sin dependencias externas (compatible con openpyxl, Excel, Google Sheets y Calc)

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function getRelId(el) {
  return (
    el.getAttribute('r:id') ||
    el.getAttributeNS(REL_NS, 'id') ||
    el.getAttribute('id') ||
    ''
  );
}

function byLocalName(root, local) {
  const out = [];
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === local) out.push(all[i]);
  }
  return out;
}

export function normalizeZipPath(target, baseDir = 'xl') {
  if (!target) return '';
  let clean = String(target).trim().replace(/\\/g, '/');
  if (clean.startsWith('/')) {
    return clean.replace(/^\/+/, '');
  }
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const part of clean.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else if (part === 'xl' && stack.length === 1 && stack[0] === 'xl') {
      // Evita duplicar xl/xl/... cuando Target ya incluye "xl/..."
      continue;
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

function colLettersToIndex(letters) {
  if (!letters) return -1;
  let n = 0;
  const up = letters.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const code = up.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    n = n * 26 + (code - 64);
  }
  return n - 1;
}

export async function unzipBuffer(buffer) {
  const dv = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  let eocd = -1;
  const minPos = Math.max(0, u8.length - 65558);
  for (let i = u8.length - 22; i >= minPos; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('El archivo no es un libro Excel (.xlsx) válido.');
  }

  const totalEntries = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  const entries = {};
  let pos = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > u8.length || dv.getUint32(pos, true) !== 0x02014b50) break;
    const method = dv.getUint16(pos + 10, true);
    const compSize = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localOffset = dv.getUint32(pos + 42, true);

    const rawName = decoder.decode(u8.slice(pos + 46, pos + 46 + nameLen));
    const normName = rawName.replace(/^\/+/, '');
    const localNameLen = dv.getUint16(localOffset + 26, true);
    const localExtraLen = dv.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = u8.slice(dataStart, dataStart + compSize);

    entries[normName] = async () => {
      if (method === 0) return compressed;
      if (method === 8) {
        if (typeof DecompressionStream === 'undefined') {
          throw new Error('Navegador sin soporte DecompressionStream. Usa CSV.');
        }
        const ds = new DecompressionStream('deflate-raw');
        const stream = new Blob([compressed]).stream().pipeThrough(ds);
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
      throw new Error(`Método de compresión ZIP (${method}) no soportado.`);
    };

    pos += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function parseXlsxFile(file) {
  const buffer = await file.arrayBuffer();
  const entries = await unzipBuffer(buffer);
  const decoder = new TextDecoder('utf-8');
  const parser = new DOMParser();

  const findEntryKey = (wanted) => {
    if (entries[wanted]) return wanted;
    const lower = wanted.toLowerCase();
    return Object.keys(entries).find((k) => k.toLowerCase() === lower) || '';
  };

  const readXml = async (path) => {
    const key = findEntryKey(path);
    if (!key) return null;
    const text = decoder.decode(await entries[key]());
    return parser.parseFromString(text, 'application/xml');
  };

  let sharedStrings = [];
  const sstXml = await readXml('xl/sharedStrings.xml');
  if (sstXml) {
    sharedStrings = byLocalName(sstXml, 'si').map((si) =>
      byLocalName(si, 't').map((t) => t.textContent || '').join('')
    );
  }

  const relMap = {};
  const wbRelsXml = await readXml('xl/_rels/workbook.xml.rels');
  if (wbRelsXml) {
    byLocalName(wbRelsXml, 'Relationship').forEach((rel) => {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) relMap[id] = normalizeZipPath(target, 'xl');
    });
  }

  let sheetDefs = [];
  const wbXml = await readXml('xl/workbook.xml');
  if (wbXml) {
    sheetDefs = byLocalName(wbXml, 'sheet').map((s, idx) => {
      const rid = getRelId(s);
      const target = relMap[rid] || `xl/worksheets/sheet${idx + 1}.xml`;
      return {
        name: s.getAttribute('name') || `Hoja ${idx + 1}`,
        target
      };
    });
  }

  if (!sheetDefs.length) {
    sheetDefs = Object.keys(entries)
      .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
      .sort()
      .map((k, idx) => ({ name: `Hoja ${idx + 1}`, target: k }));
  }

  const sheets = [];
  for (const def of sheetDefs) {
    const sheetXml = await readXml(def.target);
    if (!sheetXml) continue;

    const hyperlinks = {};
    const slashIdx = def.target.lastIndexOf('/');
    const dir = slashIdx >= 0 ? def.target.slice(0, slashIdx) : 'xl/worksheets';
    const filePart = slashIdx >= 0 ? def.target.slice(slashIdx + 1) : def.target;
    const sheetRelsXml = await readXml(`${dir}/_rels/${filePart}.rels`);

    if (sheetRelsXml) {
      const hRels = {};
      byLocalName(sheetRelsXml, 'Relationship').forEach((r) => {
        hRels[r.getAttribute('Id')] = r.getAttribute('Target') || '';
      });
      byLocalName(sheetXml, 'hyperlink').forEach((h) => {
        const ref = h.getAttribute('ref');
        const rid = getRelId(h);
        if (ref && hRels[rid]) hyperlinks[ref] = hRels[rid];
      });
    }

    const rows = [];
    byLocalName(sheetXml, 'row').forEach((rowEl) => {
      const rowArr = [];
      let nextCol = 0;
      const cells = byLocalName(rowEl, 'c');
      cells.forEach((cellEl) => {
        const ref = cellEl.getAttribute('r') || '';
        const letters = ref.replace(/[0-9]/g, '');
        const cIdx = letters ? colLettersToIndex(letters) : nextCol;
        nextCol = cIdx + 1;

        const cType = cellEl.getAttribute('t') || '';
        let value = '';
        if (cType === 'inlineStr') {
          value = byLocalName(cellEl, 't').map((t) => t.textContent || '').join('');
        } else {
          const vNode = byLocalName(cellEl, 'v')[0];
          const rawV = vNode ? vNode.textContent || '' : '';
          if (cType === 's') {
            value = sharedStrings[Number(rawV)] ?? rawV;
          } else if (cType === 'b') {
            value = rawV === '1' ? 'Sí' : 'No';
          } else {
            value = rawV;
          }
        }

        let href = (ref && hyperlinks[ref]) || '';
        if (!href) {
          const fNode = byLocalName(cellEl, 'f')[0];
          const formula = fNode ? fNode.textContent || '' : '';
          const m = formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
          if (m) href = m[1];
        }
        rowArr[cIdx] = { value: String(value).trim(), href };
      });

      if (rowArr.some((cell) => cell && (cell.value !== '' || cell.href !== ''))) {
        rows.push(rowArr);
      }
    });

    if (rows.length) {
      sheets.push({ name: def.name, rows });
    }
  }

  return sheets;
}
