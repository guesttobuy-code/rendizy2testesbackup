import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: node scripts/analyze-valores-nao-batem.mjs <xlsxPath>');
  process.exit(2);
}

const xlsxPath = path.resolve(fileArg);
if (!fs.existsSync(xlsxPath)) {
  console.error('File not found:', xlsxPath);
  process.exit(2);
}

function toNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = value
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function pickColumn(row, keys) {
  for (const k of keys) {
    if (k in row) return row[k];
  }
  return undefined;
}

const workbook = XLSX.readFile(xlsxPath, { cellDates: true });
const sheetNames = workbook.SheetNames;
console.log('File:', xlsxPath);
console.log('Sheets:', sheetNames.join(', '));

const allRows = [];
for (const name of sheetNames) {
  const sheet = workbook.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (!raw.length) continue;

  // Remap headers to normalized keys for robust analysis
  const mapped = raw.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeHeader(k)] = v;
    }
    out.__sheet = name;
    return out;
  });

  allRows.push(...mapped);
}

if (!allRows.length) {
  console.log('No rows found.');
  process.exit(0);
}

// Heuristics: detect columns that look like totals and differences
const sampleKeys = Object.keys(allRows[0]).filter((k) => k !== '__sheet');
console.log('Detected columns (normalized):');
console.log(sampleKeys.join(', '));

const id = (r) =>
  String(
    pickColumn(r, ['external_id', 'externalid', 'id', 'reservation_id', 'codigo', 'confirmation_code', 'stays_reservation_id']) ||
      ''
  ).trim();

const status = (r) => String(pickColumn(r, ['status', 'situacao', 'estado']) || '').trim();
const platform = (r) => String(pickColumn(r, ['platform', 'plataforma', 'canal', 'origem']) || '').trim();

const staysTotal = (r) =>
  toNumber(
    pickColumn(r, [
      'total_stays',
      'stays_total',
      'stays_valor',
      'valor_stays',
      'total_staysnet',
      'staysnet_total',
      'total_no_stays',
      'total_da_reserva_stays',
      'total_da_reserva_staysnet',
    ])
  );

const rendizyTotal = (r) =>
  toNumber(
    pickColumn(r, [
      'total_rendizy',
      'rendizy_total',
      'rendizy_valor',
      'valor_rendizy',
      'total_no_rendizy',
      'total_sistema',
      'total',
    ])
  );

const diff = (r) => {
  const explicit = pickColumn(r, ['diff', 'diferenca', 'diferenca_total', 'delta', 'erro']);
  const d = toNumber(explicit);
  if (explicit !== undefined && explicit !== '') return d;
  return rendizyTotal(r) - staysTotal(r);
};

let sumStays = 0;
let sumRendizy = 0;
let sumDiff = 0;

const rowsComputed = allRows.map((r) => {
  const s = staysTotal(r);
  const t = rendizyTotal(r);
  const d = diff(r);
  sumStays += s;
  sumRendizy += t;
  sumDiff += d;

  const rid = id(r);
  const ridLower = String(rid || '').toLowerCase();
  const isSummaryRow =
    ridLower.includes('somatorio') ||
    ridLower.includes('somatório') ||
    ridLower.includes('total') ||
    String(pickColumn(r, ['externalid', 'external_id', 'id']) || '').toLowerCase().includes('som');

  const denom = Math.max(1, Math.abs(s));
  const diffPct = s === 0 ? null : (d / denom) * 100;

  return {
    sheet: r.__sheet,
    id: rid,
    staysId: String(pickColumn(r, ['id_reserva_stays', 'stays_id', 'reservation_id_stays', 'id_stays']) || '').trim(),
    status: status(r),
    platform: platform(r),
    stays: s,
    rendizy: t,
    diff: d,
    diffPct,
    isSummaryRow,
    raw: r,
  };
});

const rowsWithDiff = rowsComputed
  .filter((x) => !x.isSummaryRow)
  .filter((x) => Math.abs(x.diff) > 0.009);

rowsWithDiff.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

console.log('\nTotals:');
console.log('  sum(stays):  ', sumStays.toFixed(2));
console.log('  sum(rendizy):', sumRendizy.toFixed(2));
console.log('  sum(diff):   ', sumDiff.toFixed(2));
console.log('  rows:', allRows.length);
console.log('  rowsWithDiff:', rowsWithDiff.length);

console.log('\nTop 30 diffs:');
for (const r of rowsWithDiff.slice(0, 30)) {
  const pct = r.diffPct == null ? '' : ` pct=${r.diffPct.toFixed(2)}%`;
  console.log(
    `- [${r.sheet}] id=${r.id || '(no id)'} platform=${r.platform || '-'} status=${r.status || '-'} stays=${r.stays.toFixed(
      2
    )} rendizy=${r.rendizy.toFixed(2)} diff=${r.diff.toFixed(2)}${pct} staysId=${r.staysId || '-'}`
  );
}

console.log('\nTop 30 by percent diff (abs):');
const byPct = rowsWithDiff
  .filter((r) => r.diffPct != null)
  .slice()
  .sort((a, b) => Math.abs((b.diffPct ?? 0)) - Math.abs((a.diffPct ?? 0)));
for (const r of byPct.slice(0, 30)) {
  console.log(
    `- [${r.sheet}] id=${r.id || '(no id)'} stays=${r.stays.toFixed(2)} rendizy=${r.rendizy.toFixed(2)} diff=${r.diff.toFixed(
      2
    )} pct=${(r.diffPct ?? 0).toFixed(2)}% staysId=${r.staysId || '-'}`
  );
}

// Group by status/platform for patterns
function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const prev = m.get(k) || { count: 0, sumDiff: 0, sumStays: 0, sumRendizy: 0 };
    prev.count += 1;
    prev.sumDiff += item.diff;
    prev.sumStays += item.stays;
    prev.sumRendizy += item.rendizy;
    m.set(k, prev);
  }
  return Array.from(m.entries()).sort((a, b) => Math.abs(b[1].sumDiff) - Math.abs(a[1].sumDiff));
}

console.log('\nDiff by status (top 15):');
for (const [k, v] of groupBy(rowsWithDiff, (r) => r.status || '(empty)').slice(0, 15)) {
  console.log(`- ${k}: count=${v.count} sumDiff=${v.sumDiff.toFixed(2)} stays=${v.sumStays.toFixed(2)} rendizy=${v.sumRendizy.toFixed(2)}`);
}

console.log('\nDiff by platform (top 15):');
for (const [k, v] of groupBy(rowsWithDiff, (r) => r.platform || '(empty)').slice(0, 15)) {
  console.log(`- ${k}: count=${v.count} sumDiff=${v.sumDiff.toFixed(2)} stays=${v.sumStays.toFixed(2)} rendizy=${v.sumRendizy.toFixed(2)}`);
}

// Export a normalized CSV-like sheet (xlsx) for easy filtering
const outPath = xlsxPath.replace(/\.(xlsx|xlsm|xls)$/i, '') + '_analysis.xlsx';
const exportRows = rowsComputed
  .filter((r) => !r.isSummaryRow)
  .map((r) => ({
  sheet: r.sheet,
  id: r.id,
  stays_id: r.staysId,
  platform: r.platform,
  status: r.status,
  stays_total: r.stays,
  rendizy_total: r.rendizy,
  diff: r.diff,
  diff_pct: r.diffPct,
}));
const outWb = XLSX.utils.book_new();
const outSheet = XLSX.utils.json_to_sheet(exportRows);
XLSX.utils.book_append_sheet(outWb, outSheet, 'diffs');
XLSX.writeFile(outWb, outPath);
console.log('\nWrote:', outPath);
