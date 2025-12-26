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

async function fetchAllPagedArray({ baseUrl, endpoint, credentials, paramsBase, limit, maxPages, startSkip }) {
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

  const endpoint = '/content/listings';
  const status = String(args.status || '').trim();
  const groupId = String(args.groupId || '').trim();
  const rel = String(args.rel || '').trim();
  const propertyId = String(args.propertyId || '').trim();

  // Docs say max=20; keep it strict to avoid server errors.
  const limit = Math.min(20, Math.max(1, Number(args.limit || 20)));
  const maxPages = Math.max(1, Number(args.maxPages || 10));
  const startSkip = Math.max(0, Number(args.skip || 0));
  const sampleRooms = Math.max(0, Number(args.sampleRooms || 0));

  const runId = runIdFromNow();

  const outRoot = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');
  const exportDir = path.join(outRoot, `listings-${runId}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const docsDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(docsDir, { recursive: true });

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

  const paramsBase = {};
  if (status) paramsBase.status = status;
  if (groupId) paramsBase.groupId = groupId;
  if (rel) paramsBase.rel = rel;
  if (propertyId) paramsBase.propertyId = propertyId;

  const { all: listings, next } = await fetchAllPagedArray({
    baseUrl,
    endpoint,
    credentials,
    paramsBase,
    limit,
    maxPages,
    startSkip,
  });

  const listingsRawPath = path.join(exportDir, 'listings_raw.json');
  fs.writeFileSync(listingsRawPath, JSON.stringify(listings, null, 2), 'utf8');

  // Optional: sample /content/listing-rooms/{listingId}
  let roomsSamplePath = null;
  const roomsSamples = [];
  if (sampleRooms > 0) {
    const roomsEndpointPrefix = '/content/listing-rooms/';
    for (const l of listings.slice(0, sampleRooms)) {
      const listingId = l?._id;
      if (!listingId) continue;
      const url = `${baseUrl}${roomsEndpointPrefix}${encodeURIComponent(String(listingId))}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        roomsSamples.push({ listingId, ok: false, status: res.status, error: body.slice(0, 300) });
        continue;
      }

      const data = await res.json();
      roomsSamples.push({ listingId, ok: true, data });
    }

    roomsSamplePath = path.join(exportDir, 'listing_rooms_samples.json');
    fs.writeFileSync(roomsSamplePath, JSON.stringify(roomsSamples, null, 2), 'utf8');
  }

  const meta = {
    runId,
    generatedAt: new Date().toISOString(),
    stays: {
      baseUrl,
      endpoint,
    },
    query: {
      status: status || null,
      groupId: groupId || null,
      rel: rel || null,
      propertyId: propertyId || null,
      limit,
      maxPages,
      startSkip,
      sampleRooms,
    },
    result: {
      fetched: listings.length,
      next,
    },
    outputs: {
      listingsRawPath,
      roomsSamplePath,
    },
  };

  const metaPath = path.join(exportDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Summary analysis (no PII values printed)
  const first = listings[0] || {};
  const topLevelKeys = Object.keys(first).sort();
  const statusObserved = countBy(listings.map((l) => l?.status));
  const relObserved = countBy(listings.map((l) => l?.rel));
  const currencyObserved = countBy(listings.map((l) => l?.deff_curr));
  const listingTypeObserved = countBy(listings.map((l) => l?._idtype));

  const observedPaths = new Set();
  for (const l of listings.slice(0, Math.min(20, listings.length))) {
    flattenPaths(l, '', observedPaths, { maxArrayItems: 20 });
  }
  if (roomsSamples.length) {
    for (const r of roomsSamples.slice(0, Math.min(10, roomsSamples.length))) {
      if (r?.ok && r?.data) flattenPaths(r.data, 'listingRooms', observedPaths, { maxArrayItems: 20 });
    }
  }

  const md = [];
  md.push(`# Stays API — listings export (direto) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Extrair direto do endpoint de listagens (fonte de verdade) para validar campos reais de “imóveis/anúncios”.');
  md.push('');
  md.push('## Como foi extraído');
  md.push(`- Endpoint: \`${endpoint}\``);
  md.push(`- Base URL: \`${baseUrl}\``);
  md.push(`- Filtros: status=\`${status || '(vazio)'}\`, groupId=\`${groupId || '(vazio)'}\`, rel=\`${rel || '(vazio)'}\`, propertyId=\`${propertyId || '(vazio)'}\``);
  md.push(`- Paginação: \`limit=${limit}\` (doc: max 20), \`maxPages=${maxPages}\`, \`startSkip=${startSkip}\``);
  if (sampleRooms > 0) md.push(`- Amostra rooms: \`sampleRooms=${sampleRooms}\` via \`/content/listing-rooms/{listingId}\``);
  md.push('');
  md.push('## Saída');
  md.push(`- Raw JSON: \`${path.relative(repoRoot, listingsRawPath).replace(/\\/g, '/')}\``);
  if (roomsSamplePath) md.push(`- Rooms sample: \`${path.relative(repoRoot, roomsSamplePath).replace(/\\/g, '/')}\``);
  md.push(`- Meta: \`${path.relative(repoRoot, metaPath).replace(/\\/g, '/')}\``);
  md.push('');
  md.push('## Resultado');
  md.push(`- Fetched: **${listings.length}**`);
  md.push(`- next.skip: **${next.skip}**`);
  md.push(`- next.hasMore: **${next.hasMore ? 'true' : 'false'}**`);
  md.push('');
  md.push('## Campos observados (alto nível)');
  md.push(
    `- Top-level keys (1ª listing): ${topLevelKeys.slice(0, 60).map((k) => `\`${k}\``).join(', ')}${topLevelKeys.length > 60 ? ', …' : ''}`
  );
  md.push('');
  md.push('## Enum candidates (observado)');
  md.push('');
  md.push('### status');
  for (const [k, c] of statusObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### rel');
  for (const [k, c] of relObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### deff_curr');
  for (const [k, c] of currencyObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### _idtype');
  for (const [k, c] of listingTypeObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('## Paths observados (amostra)');
  md.push('| path |');
  md.push('|---|');
  for (const p of Array.from(observedPaths).sort().slice(0, 400)) md.push(`| ${mdEscape(p)} |`);
  if (observedPaths.size > 400) md.push(`| … (${observedPaths.size - 400} paths omitidos) |`);
  md.push('');
  md.push('## Nota de segurança');
  md.push('- O arquivo raw pode conter dados sensíveis (endereço, etc). Evite commitar esses exports; use apenas localmente para auditoria/mapeamento.');

  const docPath = path.join(docsDir, `STAYSNET_API_LISTINGS_EXPORT_${runId}.md`);
  fs.writeFileSync(docPath, md.join('\n'), 'utf8');

  console.log(`\nOK: wrote raw JSON to ${listingsRawPath}`);
  if (roomsSamplePath) console.log(`OK: wrote rooms sample to ${roomsSamplePath}`);
  console.log(`OK: wrote doc to ${docPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
