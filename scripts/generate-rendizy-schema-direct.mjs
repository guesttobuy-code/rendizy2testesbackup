import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.resolve(repoRoot, 'supabase', 'migrations');

function loadEnvFile() {
  const envLocalPath = path.join(repoRoot, '.env.local');
  const envExamplePath = path.join(repoRoot, '.env.example');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: false, quiet: true });
    return;
  }

  if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath, override: false, quiet: true });
  }
}

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ''
  ).trim();
}

function getSupabaseServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    ''
  ).trim();
}

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

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function listSqlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith('.sql'))
    .map((n) => path.join(dir, n))
    .sort();
}

function normalizeIdent(raw) {
  return String(raw || '')
    .trim()
    .replace(/^public\./i, '')
    .replace(/^"|"$/g, '');
}

function isColumnLine(line) {
  const s = line.trim();
  if (!s) return false;
  if (s.startsWith('--')) return false;
  if (s.startsWith(')')) return false;

  // Never treat DDL statements as column declarations.
  if (/^create\s+table\b/i.test(s)) return false;
  if (/^alter\s+table\b/i.test(s)) return false;
  if (/^drop\s+/i.test(s)) return false;
  if (/^comment\s+on\b/i.test(s)) return false;

  const lowered = s.toLowerCase();
  const badStarts = [
    'constraint',
    'primary key',
    'unique',
    'check',
    'foreign key',
  ];
  if (badStarts.some((p) => lowered.startsWith(p))) return false;

  // must look like: <ident> <type>
  return /^[a-zA-Z_][a-zA-Z0-9_]*\s+/.test(s);
}

function parseColumn(line) {
  const s = line.trim().replace(/,$/, '');
  const m = s.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+(.+)$/);
  if (!m) return null;
  const col = m[1];
  const rest = m[2];
  // Type is first token (may include parens like numeric(10,2)) and may be schema-qualified.
  const typeMatch = rest.match(/^([a-zA-Z0-9_.]+(?:\s*\([^)]*\))?)/);
  const type = typeMatch ? typeMatch[1].trim() : '';
  return { col, type, def: rest.trim() };
}

function readCreateTableBlocks(sqlText) {
  const blocks = [];
  const lines = sqlText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/create\s+table\b/i.test(line)) continue;

    // capture header: create table if not exists <name>
    const header = line;
    const nameMatch = header.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)/i);
    if (!nameMatch) continue;
    const table = normalizeIdent(nameMatch[1]);

    // Now accumulate until matching ');' at parenDepth 0.
    let buf = [line];
    let depth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;

    let j = i + 1;
    for (; j < lines.length; j += 1) {
      buf.push(lines[j]);
      depth += (lines[j].match(/\(/g) || []).length;
      depth -= (lines[j].match(/\)/g) || []).length;
      if (depth <= 0 && /\)\s*;\s*$/.test(lines[j].trim())) {
        break;
      }
    }

    blocks.push({ table, block: buf.join('\n') });
    i = j;
  }
  return blocks;
}

function parseCreateTableColumns(blockText) {
  const lines = blockText.split(/\r?\n/);
  const cols = [];
  for (const line of lines) {
    if (!isColumnLine(line)) continue;
    const parsed = parseColumn(line);
    if (!parsed) continue;
    cols.push(parsed);
  }
  return cols;
}

function parseAlterAddColumns(sqlText) {
  // Very pragmatic parser: find ALTER TABLE <tbl> ... ADD COLUMN [IF NOT EXISTS] <col> <type...>;
  const results = [];
  const re = /alter\s+table\s+([^\s;]+)[\s\S]*?add\s+column(?:\s+if\s+not\s+exists)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([^;\n]+)\s*;/gi;
  let m;
  while ((m = re.exec(sqlText)) !== null) {
    const table = normalizeIdent(m[1]);
    const col = m[2];
    const rest = m[3].trim();
    const typeMatch = rest.match(/^([a-zA-Z0-9_.]+(?:\s*\([^)]*\))?)/);
    const type = typeMatch ? typeMatch[1].trim() : '';
    results.push({ table, col, type, def: rest });
  }
  return results;
}

async function fetchSampleRow({ supabaseUrl, serviceKey, table }) {
  const base = supabaseUrl.replace(/\/+$/, '');
  const url = `${base}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, statusText: res.statusText, body: body.slice(0, 300), row: null };
  }

  const data = await res.json().catch(() => null);
  const row = Array.isArray(data) ? (data[0] ?? null) : data;
  return { ok: true, row };
}

function stringifyExample(v) {
  if (v === null) return 'null';
  if (v === undefined) return '(missing)';
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.length > 220) return `${s.slice(0, 217)}…`;
    return s || '(empty)';
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    if (s.length > 220) return `${s.slice(0, 217)}…`;
    return s;
  } catch {
    return String(v);
  }
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const tablesArg = String(args.tables || '').trim();
  const allowTables = tablesArg
    ? tablesArg.split(',').map((x) => x.trim()).filter(Boolean)
    : [
        'properties',
        'listings',
        'guests',
        'reservations',
        'staysnet_config',
        'staysnet_webhooks',
        'staysnet_sync_log',
        'staysnet_reservations_cache',
        'staysnet_properties_cache',
        'financeiro_lancamentos',
        'financeiro_titulos',
        'financeiro_linhas_extrato',
        'financeiro_regras_conciliacao',
      ];

  const sqlFiles = listSqlFiles(migrationsDir);
  if (!sqlFiles.length) {
    throw new Error(`No SQL migrations found at: ${migrationsDir}`);
  }

  const columnsByTable = new Map(); // table -> Map(col -> {type, def, sources:[]})
  const touchedTables = new Set();

  for (const f of sqlFiles) {
    const sql = fs.readFileSync(f, 'utf8');
    const creates = readCreateTableBlocks(sql);
    for (const b of creates) {
      if (!allowTables.includes(b.table)) continue;
      touchedTables.add(b.table);
      const cols = parseCreateTableColumns(b.block);
      if (!columnsByTable.has(b.table)) columnsByTable.set(b.table, new Map());
      const map = columnsByTable.get(b.table);
      for (const c of cols) {
        if (!map.has(c.col)) {
          map.set(c.col, { type: c.type, def: c.def, sources: [path.basename(f)] });
        }
      }
    }

    const alters = parseAlterAddColumns(sql);
    for (const a of alters) {
      if (!allowTables.includes(a.table)) continue;
      touchedTables.add(a.table);
      if (!columnsByTable.has(a.table)) columnsByTable.set(a.table, new Map());
      const map = columnsByTable.get(a.table);
      if (!map.has(a.col)) {
        map.set(a.col, { type: a.type, def: a.def, sources: [path.basename(f)] });
      } else {
        const existing = map.get(a.col);
        if (!existing.sources.includes(path.basename(f))) existing.sources.push(path.basename(f));
      }
    }
  }

  const runId = runIdFromNow();
  const outDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `RENDIZY_SCHEMA_CONSOLIDADO_${runId} (Json completo Rendizy).md`);

  const md = [];
  md.push(`# Rendizy — schema consolidado (observado via migrations + 1 sample row) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Gerar uma lista semelhante à do Stays para os campos do Rendizy (tabelas/colunas).');
  md.push('- Fonte: migrações SQL + um registro de amostra por tabela via Supabase REST (service role).');
  md.push('');
  md.push('## Tabelas incluídas');
  md.push(`- ${allowTables.map((t) => `\`${t}\``).join(', ')}`);
  md.push('');

  const tables = Array.from(touchedTables).sort();
  for (const table of tables) {
    const colMap = columnsByTable.get(table) || new Map();
    const cols = Array.from(colMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const sample = await fetchSampleRow({ supabaseUrl, serviceKey, table });
    md.push(`## ${table}`);
    if (!sample.ok) {
      md.push(`- Sample: **falhou** (HTTP ${sample.status} ${mdEscape(sample.statusText)})`);
    } else if (!sample.row) {
      md.push('- Sample: **vazio** (0 registros retornados)');
    } else {
      md.push('- Sample: **ok** (1 registro)');
    }

    md.push('| path | type | exemplo |');
    md.push('|---|---|---|');

    for (const [col, meta] of cols) {
      const v = sample.row ? sample.row[col] : undefined;
      const ex = stringifyExample(v);
      md.push(`| ${mdEscape(`${table}.${col}`)} | ${mdEscape(meta.type || '')} | ${mdEscape(ex)} |`);
    }

    // Also include any keys from sample row that were not in migrations parsing (computed, legacy, etc.)
    if (sample.ok && sample.row && typeof sample.row === 'object') {
      const extraCols = Object.keys(sample.row)
        .filter((k) => !colMap.has(k))
        .sort();
      if (extraCols.length) {
        md.push(`| ${mdEscape(`${table}.*`)} |  |  |`);
        for (const k of extraCols) {
          md.push(`| ${mdEscape(`${table}.${k}`)} | (not in parsed migrations) | ${mdEscape(stringifyExample(sample.row[k]))} |`);
        }
      }
    }

    md.push('');
  }

  fs.writeFileSync(outPath, md.join('\n'), 'utf8');
  console.log(`OK: wrote Rendizy schema doc to ${outPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
