import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    const isFlag = next === undefined || String(next).startsWith('--');
    if (isFlag) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizeReserveCode(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toUpperCase();
  if (!s) return null;
  if (/^[A-Z0-9]{3,20}$/.test(s)) return s;
  return null;
}

function getReserveFromUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const reserve = u.searchParams.get('reserve');
    return normalizeReserveCode(reserve);
  } catch {
    // Some exports may omit protocol; try to salvage by regex.
    const m = s.match(/[?&]reserve=([A-Za-z0-9]+)/);
    return normalizeReserveCode(m ? m[1] : null);
  }
}

function sheetToRows(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function pickColumnCaseInsensitive(row, candidates) {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  const lowerToKey = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const k = lowerToKey.get(String(c).toLowerCase());
    if (k) return k;
  }
  return null;
}

function setDiff(a, b) {
  const out = [];
  for (const v of a) if (!b.has(v)) out.push(v);
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const staysPath = args.stays || args._[0];
  const rendizyPath = args.rendizy || args._[1];

  if (!staysPath || !rendizyPath) {
    console.error('Usage: node scripts/compare-stays-vs-rendizy-reservecodes.mjs --stays <stays.xlsx> --rendizy <rendizy.xls>');
    process.exit(2);
    return;
  }

  const absStays = path.resolve(process.cwd(), staysPath);
  const absRendizy = path.resolve(process.cwd(), rendizyPath);
  if (!fs.existsSync(absStays)) throw new Error(`File not found: ${absStays}`);
  if (!fs.existsSync(absRendizy)) throw new Error(`File not found: ${absRendizy}`);

  const staysWb = XLSX.readFile(absStays, { raw: false, cellDates: true });
  const rendWb = XLSX.readFile(absRendizy, { raw: false, cellDates: true });

  const staysSheet = staysWb.SheetNames[0];
  const rendSheet = rendWb.SheetNames[0];

  const staysRows = sheetToRows(staysWb, staysSheet);
  const rendRows = sheetToRows(rendWb, rendSheet);

  const staysReservaKey = pickColumnCaseInsensitive(staysRows[0], ['Reserva', 'reservation', 'reserve', 'reserva']);
  if (!staysReservaKey) throw new Error(`STAYS: could not find a 'Reserva' column in sheet '${staysSheet}'`);

  const rendUrlKey = pickColumnCaseInsensitive(rendRows[0], ['externalUrl', 'external_url', 'url', 'link']);
  if (!rendUrlKey) throw new Error(`RENDIZY: could not find an externalUrl column in sheet '${rendSheet}'`);

  const staysSet = new Set();
  const staysSample = new Map();
  for (let i = 0; i < staysRows.length; i += 1) {
    const r = staysRows[i];
    const code = normalizeReserveCode(r[staysReservaKey]);
    if (!code) continue;
    staysSet.add(code);
    if (!staysSample.has(code)) {
      staysSample.set(code, {
        rowNumber: i + 2,
        chegada: r['Chegada'] || r['checkin'] || r['checkIn'] || '',
        checkout: r['Data de checkout'] || r['checkout'] || r['checkOut'] || '',
        canal: r['Canal'] || r['channel'] || '',
      });
    }
  }

  const rendSet = new Set();
  const rendSample = new Map();
  for (let i = 0; i < rendRows.length; i += 1) {
    const r = rendRows[i];
    const code = getReserveFromUrl(r[rendUrlKey]);
    if (!code) continue;
    rendSet.add(code);
    if (!rendSample.has(code)) {
      rendSample.set(code, {
        rowNumber: i + 2,
        externalId: r['externalId'] || r['external_id'] || null,
        status: r['status'] || null,
        checkIn: r['checkIn'] || null,
        checkOut: r['checkOut'] || null,
      });
    }
  }

  const staysOnly = setDiff(staysSet, rendSet).sort();
  const rendOnly = setDiff(rendSet, staysSet).sort();

  console.log(`STAYS reserve codes: ${staysSet.size} (sheet=${staysSheet}, col=${staysReservaKey})`);
  console.log(`RENDIZY reserve codes: ${rendSet.size} (sheet=${rendSheet}, col=${rendUrlKey})`);
  console.log(`STAYS-only (missing in Rendizy): ${staysOnly.length}`);
  if (staysOnly.length <= 30) {
    for (const c of staysOnly) {
      const s = staysSample.get(c);
      console.log(`  - ${c}${s ? ` | chegada=${s.chegada} checkout=${s.checkout} canal=${s.canal}` : ''}`);
    }
  } else {
    console.log('  (many; increase filters or inspect manually)');
  }

  if (rendOnly.length) {
    console.log(`RENDIZY-only (missing in Stays): ${rendOnly.length} (top 20)`);
    for (const c of rendOnly.slice(0, 20)) console.log(`  - ${c}`);
  }

  const outDir = path.resolve(process.cwd(), '_reports', 'diffs');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `reservecodes_diff_${Date.now()}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputs: { stays: absStays, rendizy: absRendizy },
        stays: { sheet: staysSheet, col: staysReservaKey, total: staysSet.size },
        rendizy: { sheet: rendSheet, col: rendUrlKey, total: rendSet.size },
        diff: { staysOnly, rendOnly },
        samples: {
          staysOnly: staysOnly.map((c) => ({ code: c, stays: staysSample.get(c) || null, rendizy: rendSample.get(c) || null })),
        },
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`OK: wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
