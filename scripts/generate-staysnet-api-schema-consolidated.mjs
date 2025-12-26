import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const exportsRoot = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');

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

function runIdFromNow() {
  const s = new Date().toISOString();
  return s.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function isProbablyEmail(s) {
  const v = String(s);
  if (!v.includes('@')) return false;
  // Minimal check to avoid false positives like tokens
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function sanitizeExampleValue(pathKey, value) {
  const t = typeOf(value);
  if (t === 'null') return 'null';
  if (t === 'number' || t === 'boolean') return String(value);
  if (t === 'array') return '[…]';
  if (t === 'object') return '{…}';
  if (t !== 'string') return String(value);

  // Environment is safe: keep values visible; truncate long strings to keep the doc readable.
  const trimmed = String(value).trim();
  if (trimmed.length > 400) return `${trimmed.slice(0, 397)}…`;
  return trimmed || '(empty)';
}

function collectPathsAndExamples(value, basePath, outPaths, outExamples, options) {
  const t = typeOf(value);
  const currentPath = basePath || '(root)';
  outPaths.add(currentPath);
  if (!outExamples.has(currentPath)) outExamples.set(currentPath, sanitizeExampleValue(currentPath, value));

  if (t === 'array') {
    const arr = value;
    const p = basePath ? `${basePath}[]` : '[]';
    outPaths.add(p);
    if (!outExamples.has(p)) {
      const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
      outExamples.set(p, sanitizeExampleValue(p, first));
    }
    for (let i = 0; i < Math.min(arr.length, options.maxArrayItems); i += 1) {
      collectPathsAndExamples(arr[i], p, outPaths, outExamples, options);
    }
    return;
  }

  if (t === 'object') {
    if (!value) return;
    for (const k of Object.keys(value)) {
      const child = basePath ? `${basePath}.${k}` : k;
      collectPathsAndExamples(value[k], child, outPaths, outExamples, options);
    }
    return;
  }
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function listDirsSortedByMtime(prefix) {
  if (!fs.existsSync(exportsRoot)) return [];
  const dirs = fs
    .readdirSync(exportsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(prefix))
    .map((d) => {
      const full = path.join(exportsRoot, d.name);
      const st = fs.statSync(full);
      return { name: d.name, full, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return dirs;
}

function tryPickDir(prefix, explicitPath) {
  if (explicitPath) {
    const full = path.resolve(repoRoot, explicitPath);
    if (!fs.existsSync(full)) throw new Error(`Export dir not found: ${explicitPath}`);
    return full;
  }
  return listDirsSortedByMtime(prefix)[0]?.full || null;
}

function readJsonIfExists(p) {
  if (!p) return null;
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadDomain({ dir, domain, rawFile }) {
  if (!dir) return { ok: false, domain, reason: 'missing export dir', dir: null };
  const metaPath = path.join(dir, 'meta.json');
  const rawPath = rawFile ? path.join(dir, rawFile) : null;

  const meta = readJsonIfExists(metaPath);
  const raw = rawPath ? readJsonIfExists(rawPath) : null;

  return {
    ok: Boolean(meta && raw !== null),
    domain,
    dir,
    meta,
    raw,
    files: {
      metaPath,
      rawPath,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const reservationsDir = tryPickDir('reservations-', args.reservationsDir);
  const listingsDir = tryPickDir('listings-', args.listingsDir);
  const clientsDir = tryPickDir('clients-', args.clientsDir);
  const financeDir = tryPickDir('finance-', args.financeDir);

  const reservations = loadDomain({ dir: reservationsDir, domain: 'reservations', rawFile: 'reservations_raw.json' });
  const listings = loadDomain({ dir: listingsDir, domain: 'listings', rawFile: 'listings_raw.json' });
  const clients = loadDomain({ dir: clientsDir, domain: 'clients', rawFile: 'clients_raw.json' });
  const finance = loadDomain({ dir: financeDir, domain: 'finance', rawFile: 'owners_raw.json' });

  const domains = [reservations, listings, clients, finance];

  const runId = runIdFromNow();
  const docsDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, `STAYSNET_API_SCHEMA_CONSOLIDADO_${runId}.md`);

  const md = [];
  md.push(`# Stays API — schema consolidado (observado) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Consolidar os campos observados nos exports diretos da Stays (fonte de verdade) para imóveis, hóspedes, reservas e financeiro.');
  md.push('- Este documento é baseado em *evidência* (JSON exportado), não em “achismo” do banco local.');
  md.push('');

  md.push('## Segurança');
  md.push('- Os exports em `_reports/` podem conter PII e dados financeiros. Não commitar `_reports/`.' );
  md.push('- Este consolidado lista **paths** e **exemplos observados** com valores reais (ambiente seguro).');
  md.push('');

  md.push('## Fontes (últimos exports detectados)');
  md.push('| domínio | export dir | fetched | endpoint |');
  md.push('|---|---|---:|---|');

  for (const d of domains) {
    const dirRel = d.dir ? path.relative(repoRoot, d.dir).replace(/\\/g, '/') : '(não encontrado)';
    const fetched =
      d.meta?.result?.fetched ??
      (Array.isArray(d.raw) ? d.raw.length : d.raw ? 1 : 0);
    const endpoint =
      d.meta?.stays?.endpoint ||
      d.meta?.stays?.endpoints?.owners ||
      '(n/a)';
    md.push(`| ${d.domain} | ${mdEscape(dirRel)} | ${fetched} | ${mdEscape(String(endpoint))} |`);
  }
  md.push('');

  const unionPaths = new Set();
  const examplesByPath = new Map();
  const perDomainPaths = new Map();

  for (const d of domains) {
    const s = new Set();
    if (d.ok) {
      // Limit recursion by sampling if array
      const raw = d.raw;
      if (Array.isArray(raw)) {
        for (const item of raw.slice(0, 20)) {
          collectPathsAndExamples(item, d.domain, s, examplesByPath, { maxArrayItems: 20 });
        }
      } else {
        collectPathsAndExamples(raw, d.domain, s, examplesByPath, { maxArrayItems: 20 });
      }
    }
    perDomainPaths.set(d.domain, s);
    for (const p of s) unionPaths.add(p);
  }

  md.push('## Paths por domínio (amostra)');
  for (const d of domains) {
    const s = perDomainPaths.get(d.domain) || new Set();
    md.push('');
    md.push(`### ${d.domain}`);
    if (!d.ok) {
      md.push('- (export não encontrado ou incompleto)');
      continue;
    }
    md.push('| path | exemplo |');
    md.push('|---|---|');
    for (const p of Array.from(s).sort().slice(0, 250)) {
      const ex = examplesByPath.get(p) ?? '';
      md.push(`| ${mdEscape(p)} | ${mdEscape(ex)} |`);
    }
    if (s.size > 250) md.push(`| … (${s.size - 250} paths omitidos) | |`);
  }

  md.push('');
  md.push('## Union de paths (todos os domínios)');
  md.push('| path | exemplo |');
  md.push('|---|---|');
  for (const p of Array.from(unionPaths).sort().slice(0, 600)) {
    const ex = examplesByPath.get(p) ?? '';
    md.push(`| ${mdEscape(p)} | ${mdEscape(ex)} |`);
  }
  if (unionPaths.size > 600) md.push(`| … (${unionPaths.size - 600} paths omitidos) | |`);

  md.push('');
  md.push('## Reproduzir (scripts)');
  md.push('- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-listings-direct.ps1 -MaxPages 5 -Limit 20`');
  md.push('- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-reservations-direct.ps1 -MaxPages 5 -Limit 20`');
  md.push('- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-clients-direct.ps1 -MaxPages 5 -Limit 20 -SampleDetails 2`');
  md.push('- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-finance-direct.ps1 -SampleOwnerDetails 2 -SampleReservationPayments 5`');
  md.push('- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-generate-staysnet-api-schema-consolidated.ps1`');
  
  // Optional appendix: include full JSON for specific reservations.
  const includeReservationRaw = args.includeReservation;
  const includeKeys = Array.isArray(includeReservationRaw)
    ? includeReservationRaw
    : includeReservationRaw
      ? String(includeReservationRaw).split(',').map((x) => x.trim()).filter(Boolean)
      : [];
  
  if (includeKeys.length && reservations.ok && Array.isArray(reservations.raw)) {
    const wanted = new Set(includeKeys);
    const matches = reservations.raw.filter((r) => {
      const candidates = [r?._id, r?.id, r?.partnerCode].filter(Boolean).map((x) => String(x));
      return candidates.some((c) => wanted.has(c));
    });
  
    md.push('');
    md.push('## Anexo — JSON completo (reservas selecionadas)');
    md.push('- Incluído para facilitar análise e descobrir campos adicionais.');
    md.push('');
  
    if (!matches.length) {
      md.push(`- Nenhuma reserva encontrada para: ${includeKeys.map((k) => `\`${k}\``).join(', ')}`);
    } else {
      for (const r of matches.slice(0, 5)) {
        const label = r?.id || r?.partnerCode || r?._id || '(sem id)';
        md.push(`### Reserva ${mdEscape(label)}`);
        md.push('```json');
        md.push(JSON.stringify(r, null, 2));
        md.push('```');
        md.push('');
      }
      if (matches.length > 5) {
        md.push(`- … (${matches.length - 5} reservas omitidas neste anexo)`);
      }
    }
  }

  fs.writeFileSync(outPath, md.join('\n'), 'utf8');
  console.log(`OK: wrote consolidated schema doc to ${outPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
