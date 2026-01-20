import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

function repoRootFromHere() {
  // scripts/convert-*.mjs -> repoRoot
  const here = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(here), '..');
}

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' || a === '-i') args.input = argv[++i];
    else if (a === '--output' || a === '-o') args.output = argv[++i];
  }
  return args;
}

function splitMdRow(line) {
  // | a | b | c |
  const parts = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((s) => s.trim());
  return parts;
}

function isSeparatorRow(line) {
  const t = line.trim();
  if (!t.startsWith('|')) return false;
  return /^\|\s*[-:]+\s*\|/.test(t);
}

function defaultInputDoc(repoRoot) {
  return path.join(repoRoot, 'docs', '05-operations', 'STAYSNET_VS_RENDIZY_CONCILIACAO_20251226-040426.md');
}

async function main() {
  const repoRoot = repoRootFromHere();
  const args = parseArgs(process.argv);

  const inputPath = path.resolve(repoRoot, args.input || defaultInputDoc(repoRoot));
  const outputPath = path.resolve(
    repoRoot,
    args.output || inputPath.replace(/\.md$/i, '.xlsx'),
  );

  const md = await fs.readFile(inputPath, 'utf8');
  const lines = md.split(/\r?\n/);

  let domain = '';
  let headers = null;
  let inTable = false;

  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      domain = h[1].trim();
      inTable = false;
      headers = null;
      continue;
    }

    if (line.trim().startsWith('|') && !inTable) {
      // header row
      const next = lines[i + 1] || '';
      if (isSeparatorRow(next)) {
        headers = splitMdRow(line);
        inTable = true;
        i++; // skip separator
        continue;
      }
    }

    if (inTable) {
      if (!line.trim().startsWith('|')) {
        inTable = false;
        headers = null;
        continue;
      }

      // skip separator rows inside table
      if (isSeparatorRow(line)) continue;

      const cols = splitMdRow(line);
      if (!headers || cols.length < 2) continue;

      const obj = { domain };
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = cols[c] ?? '';
      }
      rows.push(obj);
    }
  }

  // Normalize to a stable column order
  const ordered = rows.map((r) => ({
    domain: r.domain || '',
    'stays.path': r['stays.path'] || '',
    'stays.exemplo': r['stays.exemplo'] || '',
    'rendizy.candidato': r['rendizy.candidato'] || '',
    'rendizy.type': r['rendizy.type'] || '',
    'rendizy.exemplo': r['rendizy.exemplo'] || '',
    status: r.status || '',
    'sugestão': r['sugestão (se faltar)'] || r['sugestão'] || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(ordered, {
    header: ['domain', 'stays.path', 'stays.exemplo', 'rendizy.candidato', 'rendizy.type', 'rendizy.exemplo', 'status', 'sugestão'],
  });

  XLSX.utils.book_append_sheet(wb, ws, 'reconciliation');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(wb, outputPath);

  console.log(`OK: wrote XLSX to ${outputPath}`);
  console.log(`Rows: ${ordered.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
