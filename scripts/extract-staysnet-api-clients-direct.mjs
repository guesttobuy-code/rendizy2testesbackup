import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile() {
  const envLocalPath = path.join(repoRoot, '.env.local');
  const envExamplePath = path.join(repoRoot, '.env.example');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: false, quiet: true });
    return { loaded: true, path: envLocalPath, fallback: false };
  }

  if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath, override: false, quiet: true });
    return { loaded: true, path: envExamplePath, fallback: true };
  }

  return { loaded: false, path: null, fallback: false };
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

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

async function tryLoadStaysConfigFromSupabase() {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) return null;

  const base = supabaseUrl.replace(/\/+$/, '');
  const url = `${base}/rest/v1/staysnet_config?select=organization_id,api_key,api_secret,base_url,enabled,updated_at&order=updated_at.desc&limit=10`;

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
    throw new Error(
      `Failed to read staysnet_config from Supabase: HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 300)}`
    );
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return null;

  const candidates = rows
    .filter((r) => r && r.api_key && r.api_secret)
    .sort((a, b) => {
      const ae = a.enabled === true ? 0 : 1;
      const be = b.enabled === true ? 0 : 1;
      return ae - be;
    });

  const pick = candidates[0];
  if (!pick) return null;

  return {
    apiKey: String(pick.api_key || '').trim(),
    apiSecret: String(pick.api_secret || '').trim(),
    baseUrl: normalizeBaseUrl(String(pick.base_url || '')),
    organizationId: String(pick.organization_id || ''),
  };
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

    if (args[key] === undefined) {
      args[key] = next;
    } else if (Array.isArray(args[key])) {
      args[key].push(next);
    } else {
      args[key] = [args[key], next];
    }

    i += 1;
  }
  return args;
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function flattenPaths(value, basePath, out, options) {
  const t = typeOf(value);
  out.add(basePath || '(root)');

  if (t === 'array') {
    const arr = value;
    const p = basePath ? `${basePath}[]` : '[]';
    out.add(p);
    for (let i = 0; i < Math.min(arr.length, options.maxArrayItems); i += 1) {
      flattenPaths(arr[i], p, out, options);
    }
    return;
  }

  if (t === 'object') {
    if (!value) return;
    for (const k of Object.keys(value)) {
      const child = basePath ? `${basePath}.${k}` : k;
      flattenPaths(value[k], child, out, options);
    }
  }
}

function countBy(arr) {
  const m = new Map();
  for (const v of arr) {
    const key = v === null || v === undefined ? '(vazio)' : String(v);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function runIdFromNow() {
  const s = new Date().toISOString();
  return s.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function normalizeBooleanLike(input) {
  const v = String(input || '').trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return null;
}

async function fetchPagedArray({ baseUrl, endpoint, credentials, paramsBase, limit, maxPages, startSkip }) {
  const all = [];
  let skip = startSkip;
  let pages = 0;
  let hasMore = false;

  while (pages < maxPages) {
    const params = new URLSearchParams({
      ...paramsBase,
      limit: String(limit),
      skip: String(skip),
    });

    const url = `${baseUrl}${endpoint}?${params}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Stays API failed: HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 400)}`);
    }

    const pageData = await res.json();
    if (!Array.isArray(pageData)) {
      throw new Error(`Expected array response from ${endpoint}, got: ${typeof pageData}`);
    }

    all.push(...pageData);

    if (pageData.length < limit) {
      hasMore = false;
      break;
    }

    skip += limit;
    pages += 1;
    hasMore = pages >= maxPages;
  }

  return { all, next: { skip, hasMore } };
}

async function main() {
  loadEnvFile();

  const args = parseArgs(process.argv.slice(2));

  let baseUrl = normalizeBaseUrl(process.env.STAYSNET_BASE_URL || 'https://bvm.stays.net/external/v1');
  let apiKey = String(process.env.STAYSNET_API_KEY || '').trim();
  let apiSecret = String(process.env.STAYSNET_API_SECRET || '').trim();

  if (!apiKey || !apiSecret) {
    const dbConfig = await tryLoadStaysConfigFromSupabase();
    if (dbConfig?.apiKey && dbConfig?.apiSecret) {
      apiKey = dbConfig.apiKey;
      apiSecret = dbConfig.apiSecret;
      if (dbConfig.baseUrl) baseUrl = dbConfig.baseUrl;
      console.log('Info: loaded Stays credentials from Supabase staysnet_config (service role).');
    }
  }

  if (!apiKey || !apiSecret) {
    console.error(
      'Missing STAYSNET_API_KEY/STAYSNET_API_SECRET. Configure in .env.local (see .env.example), or ensure staysnet_config is populated and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present in .env.local.'
    );
    process.exitCode = 2;
    return;
  }

  const endpoint = '/booking/clients';

  // Search filters (PII-sensitive; we still allow passing them but docs won't print values)
  const name = String(args.name || '').trim();
  const email = String(args.email || '').trim();
  const phone = String(args.phone || '').trim();
  const hasReservations = normalizeBooleanLike(args.hasReservations);
  const reservationFilter = String(args.reservationFilter || '').trim();
  const reservationFrom = String(args.reservationFrom || '').trim();
  const reservationTo = String(args.reservationTo || '').trim();
  const sortBy = String(args.sortBy || '').trim();
  const sort = String(args.sort || '').trim();

  // Docs say max=20
  const limit = Math.min(20, Math.max(1, Number(args.limit || 20)));
  const maxPages = Math.max(1, Number(args.maxPages || 10));
  const startSkip = Math.max(0, Number(args.skip || 0));
  const sampleDetails = Math.max(0, Number(args.sampleDetails || 0));

  const runId = runIdFromNow();
  const outRoot = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');
  const exportDir = path.join(outRoot, `clients-${runId}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const docsDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(docsDir, { recursive: true });

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

  const paramsBase = {};
  if (name) paramsBase.name = name;
  if (email) paramsBase.email = email;
  if (phone) paramsBase.phone = phone;
  if (hasReservations !== null) paramsBase.hasReservations = String(hasReservations);
  if (reservationFilter) paramsBase.reservationFilter = reservationFilter;
  if (reservationFrom) paramsBase.reservationFrom = reservationFrom;
  if (reservationTo) paramsBase.reservationTo = reservationTo;
  if (sortBy) paramsBase.sortBy = sortBy;
  if (sort) paramsBase.sort = sort;

  const { all: clients, next } = await fetchPagedArray({
    baseUrl,
    endpoint,
    credentials,
    paramsBase,
    limit,
    maxPages,
    startSkip,
  });

  const clientsRawPath = path.join(exportDir, 'clients_raw.json');
  fs.writeFileSync(clientsRawPath, JSON.stringify(clients, null, 2), 'utf8');

  let detailsSamplePath = null;
  const detailsSamples = [];
  if (sampleDetails > 0) {
    for (const c of clients.slice(0, sampleDetails)) {
      const clientId = c?._id;
      if (!clientId) continue;
      const url = `${baseUrl}${endpoint}/${encodeURIComponent(String(clientId))}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        detailsSamples.push({ clientId, ok: false, status: res.status, error: body.slice(0, 300) });
        continue;
      }

      const data = await res.json();
      detailsSamples.push({ clientId, ok: true, data });
    }

    detailsSamplePath = path.join(exportDir, 'client_details_samples.json');
    fs.writeFileSync(detailsSamplePath, JSON.stringify(detailsSamples, null, 2), 'utf8');
  }

  const meta = {
    runId,
    generatedAt: new Date().toISOString(),
    stays: {
      baseUrl,
      endpoint,
    },
    query: {
      // Do NOT echo PII values in docs; keep them only in meta for local audit
      name: name || null,
      email: email || null,
      phone: phone || null,
      hasReservations,
      reservationFilter: reservationFilter || null,
      reservationFrom: reservationFrom || null,
      reservationTo: reservationTo || null,
      sortBy: sortBy || null,
      sort: sort || null,
      limit,
      maxPages,
      startSkip,
      sampleDetails,
    },
    result: {
      fetched: clients.length,
      next,
    },
    outputs: {
      clientsRawPath,
      detailsSamplePath,
    },
  };

  const metaPath = path.join(exportDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Summary analysis (avoid PII values)
  const first = clients[0] || {};
  const topLevelKeys = Object.keys(first).sort();

  const kindObserved = countBy(clients.map((c) => c?.kind));
  const isUserObserved = countBy(clients.map((c) => c?.isUser));
  const prefLangObserved = countBy(clients.map((c) => c?.prefLang));

  const observedPaths = new Set();
  for (const c of clients.slice(0, Math.min(20, clients.length))) {
    flattenPaths(c, '', observedPaths, { maxArrayItems: 20 });
  }
  for (const d of detailsSamples.slice(0, Math.min(10, detailsSamples.length))) {
    if (d?.ok && d?.data) flattenPaths(d.data, 'clientDetails', observedPaths, { maxArrayItems: 20 });
  }

  const md = [];
  md.push(`# Stays API — clients export (direto) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Extrair direto do endpoint de clientes/hóspedes (fonte de verdade) para validar campos reais e evitar gaps no nosso schema.');
  md.push('');
  md.push('## Como foi extraído');
  md.push(`- Endpoint: \`${endpoint}\``);
  md.push(`- Base URL: \`${baseUrl}\``);
  md.push(`- Paginação: \`limit=${limit}\` (doc: max 20), \`maxPages=${maxPages}\`, \`startSkip=${startSkip}\``);
  md.push(`- Amostra details: \`sampleDetails=${sampleDetails}\` via \`/booking/clients/{clientId}\``);
  md.push('');
  md.push('## Saída');
  md.push(`- Raw JSON: \`${path.relative(repoRoot, clientsRawPath).replace(/\\/g, '/')}\``);
  if (detailsSamplePath) md.push(`- Details sample: \`${path.relative(repoRoot, detailsSamplePath).replace(/\\/g, '/')}\``);
  md.push(`- Meta: \`${path.relative(repoRoot, metaPath).replace(/\\/g, '/')}\``);
  md.push('');
  md.push('## Resultado');
  md.push(`- Fetched: **${clients.length}**`);
  md.push(`- next.skip: **${next.skip}**`);
  md.push(`- next.hasMore: **${next.hasMore ? 'true' : 'false'}**`);
  md.push('');
  md.push('## Campos observados (alto nível)');
  md.push(
    `- Top-level keys (1º client): ${topLevelKeys.slice(0, 60).map((k) => `\`${k}\``).join(', ')}${topLevelKeys.length > 60 ? ', …' : ''}`
  );
  md.push('');
  md.push('## Enum candidates (observado — sem PII)');
  md.push('');
  md.push('### kind');
  for (const [k, c] of kindObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### isUser');
  for (const [k, c] of isUserObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### prefLang');
  for (const [k, c] of prefLangObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('## Paths observados (amostra)');
  md.push('| path |');
  md.push('|---|');
  for (const p of Array.from(observedPaths).sort().slice(0, 400)) md.push(`| ${mdEscape(p)} |`);
  if (observedPaths.size > 400) md.push(`| … (${observedPaths.size - 400} paths omitidos) |`);
  md.push('');
  md.push('## Nota de segurança');
  md.push('- O raw de clientes contém PII (nome, email, documentos). Evite commitar esses exports; use apenas localmente para auditoria/mapeamento.');

  const docPath = path.join(docsDir, `STAYSNET_API_CLIENTS_EXPORT_${runId}.md`);
  fs.writeFileSync(docPath, md.join('\n'), 'utf8');

  console.log(`\nOK: wrote raw JSON to ${clientsRawPath}`);
  if (detailsSamplePath) console.log(`OK: wrote details sample to ${detailsSamplePath}`);
  console.log(`OK: wrote doc to ${docPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
