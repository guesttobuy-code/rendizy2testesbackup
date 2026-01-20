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

function normalizeHex24(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/\b[0-9a-fA-F]{24}\b/);
  if (!m) return null;
  return m[0].toLowerCase();
}

function runIdFromNow() {
  const s = new Date().toISOString();
  return s.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

function safeCellString(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

function readWorkbook(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  return XLSX.readFile(filePath, {
    cellDates: true,
    raw: false,
  });
}

function sheetRowsAsMatrix(sheet) {
  // header:1 -> array-of-arrays preserving positions
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
}

function scoreHeader(headerName, { prefer = [], avoid = [] } = {}) {
  const h = String(headerName || '').toLowerCase();
  let score = 0;
  for (const p of prefer) if (p && h.includes(p)) score += 5;
  for (const a of avoid) if (a && h.includes(a)) score -= 8;
  return score;
}

function pickBestIdColumn(wb, options = {}) {
  // Return { sheetName, colIndex, headerName, ids:Set, sampleById:Map(id -> rowInfo) }
  const {
    overlapWith = null,
    headerPrefer = [],
    headerAvoid = [],
  } = options;

  let best = null;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = sheetRowsAsMatrix(sheet);
    if (!matrix || matrix.length < 2) continue;

    const headerRow = matrix[0];
    const colCount = headerRow.length;

    // collect unique ids per column
    const colSets = Array.from({ length: colCount }, () => new Set());
    const sampleByCol = Array.from({ length: colCount }, () => new Map());

    for (let r = 1; r < matrix.length; r += 1) {
      const row = matrix[r];
      for (let c = 0; c < colCount; c += 1) {
        const id = normalizeHex24(row[c]);
        if (!id) continue;
        colSets[c].add(id);
        if (!sampleByCol[c].has(id)) {
          // Keep minimal, non-PII-ish snapshot of row
          sampleByCol[c].set(id, {
            rowNumber: r + 1,
            preview: row.slice(0, Math.min(row.length, 40)).map(safeCellString),
          });
        }
      }
    }

    for (let c = 0; c < colCount; c += 1) {
      const ids = colSets[c];
      if (ids.size === 0) continue;

      const headerName = safeCellString(headerRow[c] ?? `col_${c + 1}`).trim() || `col_${c + 1}`;

      const headerScore = scoreHeader(headerName, { prefer: headerPrefer, avoid: headerAvoid });

      let overlap = 0;
      if (overlapWith && overlapWith.size) {
        for (const id of ids) if (overlapWith.has(id)) overlap += 1;
      }

      // Overlap dominates; headerScore breaks ties; ids.size helps when overlap is equal.
      const score = overlap * 1_000_000 + headerScore * 10_000 + ids.size;

      if (!best || score > best.score) {
        best = {
          score,
          overlap,
          headerScore,
          sheetName,
          colIndex: c,
          headerName,
          ids,
          sampleById: sampleByCol[c],
        };
      }
    }
  }

  return best;
}

function readAllIdsFromColumn(wb, sheetName, colIndex) {
  const sheet = wb.Sheets[sheetName];
  const matrix = sheetRowsAsMatrix(sheet);
  const ids = new Set();
  const sampleById = new Map();

  for (let r = 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const id = normalizeHex24(row[colIndex]);
    if (!id) continue;
    ids.add(id);
    if (!sampleById.has(id)) {
      sampleById.set(id, {
        rowNumber: r + 1,
        preview: row.slice(0, Math.min(row.length, 40)).map(safeCellString),
      });
    }
  }

  return { ids, sampleById };
}

function setDiff(a, b) {
  const out = [];
  for (const v of a) if (!b.has(v)) out.push(v);
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const staysPath = args.stays || args.s || args._[0];
  const rendizyPath = args.rendizy || args.r || args._[1];

  if (!staysPath || !rendizyPath) {
    console.error('Usage: node scripts/compare-stays-xlsx-vs-rendizy-xls.mjs --stays <stays.xlsx> --rendizy <rendizy.xls>');
    process.exit(2);
    return;
  }

  const absStays = path.resolve(process.cwd(), staysPath);
  const absRendizy = path.resolve(process.cwd(), rendizyPath);

  const staysWb = readWorkbook(absStays);
  const rendizyWb = readWorkbook(absRendizy);

  // First: pick Rendizy column (usually externalId) by size + header hints.
  const rendizyBest = pickBestIdColumn(rendizyWb, {
    headerPrefer: ['external', 'externalid', 'external_id', 'reserva', 'reservation', 'booking', 'id'],
    headerAvoid: ['hospede', 'hóspede', 'guest', 'cliente', 'client'],
  });

  if (!rendizyBest) throw new Error('Could not find any 24-hex ID column in RENDIZY workbook');

  const rendizy = readAllIdsFromColumn(rendizyWb, rendizyBest.sheetName, rendizyBest.colIndex);

  // Second: pick Stays column with MAX overlap with Rendizy IDs (avoids picking guest ids).
  const staysBest = pickBestIdColumn(staysWb, {
    overlapWith: rendizy.ids,
    headerPrefer: ['reserva', 'reservation', 'booking', 'reserve', 'partner', 'external', '_id', 'id'],
    headerAvoid: ['hospede', 'hóspede', 'guest', 'cliente', 'client', 'owner'],
  });

  if (!staysBest) throw new Error('Could not find any 24-hex ID column in STAYS workbook');

  const stays = readAllIdsFromColumn(staysWb, staysBest.sheetName, staysBest.colIndex);

  const staysOnly = setDiff(stays.ids, rendizy.ids).sort();
  const rendizyOnly = setDiff(rendizy.ids, stays.ids).sort();

  const report = {
    generatedAt: new Date().toISOString(),
    inputs: { stays: absStays, rendizy: absRendizy },
    detected: {
      stays: {
        sheet: staysBest.sheetName,
        column: staysBest.headerName,
        colIndex: staysBest.colIndex,
        uniqueIds: stays.ids.size,
      },
      rendizy: {
        sheet: rendizyBest.sheetName,
        column: rendizyBest.headerName,
        colIndex: rendizyBest.colIndex,
        uniqueIds: rendizy.ids.size,
      },
    },
    diff: {
      staysOnlyCount: staysOnly.length,
      staysOnly,
      rendizyOnlyCount: rendizyOnly.length,
      rendizyOnly: rendizyOnly.slice(0, 200),
    },
    samples: {
      staysOnlySamples: staysOnly.slice(0, 50).map((id) => ({
        id,
        stays: stays.sampleById.get(id) || null,
        rendizy: rendizy.sampleById.get(id) || null,
      })),
    },
  };

  const outDir = path.resolve(process.cwd(), '_reports', 'diffs', `xlsx-stays-vs-rendizy-${runIdFromNow()}`);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Detected STAYS IDs: ${stays.ids.size} from ${staysBest.sheetName} :: ${staysBest.headerName}`);
  console.log(`Detected RENDIZY IDs: ${rendizy.ids.size} from ${rendizyBest.sheetName} :: ${rendizyBest.headerName}`);
  console.log(`STAYS-only (missing in Rendizy): ${staysOnly.length}`);
  if (staysOnly.length <= 20) {
    for (const id of staysOnly) console.log(`  - ${id}`);
  } else {
    console.log('  (see report.json for full list)');
  }

  console.log(`\nOK: wrote ${outPath}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
