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
    throw new Error(`Failed to read staysnet_config from Supabase: HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 300)}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return null;

  // Prefer enabled configs first, but accept any row with credentials.
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

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function toYmd(d) {
  return d.toISOString().split('T')[0];
}

function normalizeStaysDateType(input) {
  const v = String(input || '').trim().toLowerCase();
  if (v === 'checkin') return 'arrival';
  if (v === 'checkout') return 'departure';
  if (v === 'arrival') return 'arrival';
  if (v === 'departure') return 'departure';
  if (v === 'creation') return 'creation';
  if (v === 'creationorig') return 'creationorig';
  if (v === 'included') return 'included';
  return 'arrival';
}

function normalizeTypes(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeReservationIds(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
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

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x !== undefined && x !== null && x !== '')));
}

function safeNumber(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function runIdFromNow() {
  const s = new Date().toISOString();
  return s.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

async function main() {
  loadEnvFile();

  const args = parseArgs(process.argv.slice(2));

  let baseUrl = normalizeBaseUrl(process.env.STAYSNET_BASE_URL || 'https://bvm.stays.net/external/v1');
  let apiKey = String(process.env.STAYSNET_API_KEY || '').trim();
  let apiSecret = String(process.env.STAYSNET_API_SECRET || '').trim();

  if (!apiKey || !apiSecret) {
    const dbConfig = await tryLoadStaysConfigFromSupabase().catch((e) => {
      // Keep the error message helpful but avoid any secret leakage.
      throw e;
    });

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

  const fromDefault = new Date();
  fromDefault.setMonth(fromDefault.getMonth() - 12);
  const toDefault = new Date();
  toDefault.setMonth(toDefault.getMonth() + 12);

  const from = String(args.from || toYmd(fromDefault)).trim();
  const to = String(args.to || toYmd(toDefault)).trim();
  const dateType = normalizeStaysDateType(args.dateType || 'checkin');

  const includeCanceled = String(args.includeCanceled || '') === '1' || args.includeCanceled === true;
  const limit = Math.min(50, Math.max(1, Number(args.limit || 20)));
  const maxPages = Math.max(1, Number(args.maxPages || 10));
  const startSkip = Math.max(0, Number(args.skip || 0));

  const reservationIds = normalizeReservationIds(args.reservationId ?? args.reservationIds ?? args.reservation);

  const rawTypes = normalizeTypes(args.types ?? args.type);
  const types = rawTypes.length > 0 ? rawTypes : ['reserved', 'booked', 'contract'];
  if (includeCanceled && !types.includes('canceled')) types.push('canceled');

  const runId = runIdFromNow();

  const outRoot = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');
  const exportDir = path.join(outRoot, `reservations-${runId}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const docsDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(docsDir, { recursive: true });

  const endpoint = '/booking/reservations';
  const endpointSingle = '/booking/reservations';
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

  const all = [];
  let skip = startSkip;
  let pages = 0;
  let hasMore = false;

  while (pages < maxPages) {
    const params = new URLSearchParams({
      from,
      to,
      dateType,
      limit: String(limit),
      skip: String(skip),
    });
    for (const t of types) params.append('type', t);

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

  // Optionally fetch specific reservations by id (long), short id, or partnerCode.
  const singleFetched = [];
  for (const rid of reservationIds) {
    const url = `${baseUrl}${endpointSingle}/${encodeURIComponent(rid)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`Warn: failed to fetch reservation '${rid}': HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 200)}`);
      continue;
    }

    const data = await res.json();
    if (data && typeof data === 'object') {
      singleFetched.push({ key: rid, data });

      const exists = all.some((r) => {
        const a = r?._id ? String(r._id) : null;
        const b = r?.id ? String(r.id) : null;
        const c = r?.partnerCode ? String(r.partnerCode) : null;
        return [a, b, c].filter(Boolean).includes(String(rid));
      });
      if (!exists) all.push(data);
    }
  }

  const rawJsonPath = path.join(exportDir, 'reservations_raw.json');
  fs.writeFileSync(rawJsonPath, JSON.stringify(all, null, 2), 'utf8');

  const singleJsonPath = singleFetched.length ? path.join(exportDir, 'reservations_single_raw.json') : null;
  if (singleJsonPath) {
    fs.writeFileSync(singleJsonPath, JSON.stringify(singleFetched, null, 2), 'utf8');
  }

  const meta = {
    runId,
    generatedAt: new Date().toISOString(),
    stays: {
      baseUrl,
      endpoint,
    },
    query: {
      from,
      to,
      dateType,
      types,
      includeCanceled,
      limit,
      maxPages,
      startSkip,
      reservationIds,
    },
    result: {
      fetched: all.length,
      fetchedSingle: singleFetched.length,
      next: {
        skip,
        hasMore,
      },
    },
    outputs: {
      rawJsonPath,
      singleJsonPath,
    },
  };

  const metaPath = path.join(exportDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Summary analysis (no PII values printed)
  const first = all[0] || {};
  const topLevelKeys = Object.keys(first).sort();

  const typesObserved = countBy(all.map((r) => r?.type));
  const statusObserved = countBy(all.map((r) => r?.status));

  const partnerNameObserved = countBy(all.map((r) => r?.partner?.name));
  const partnerCodeObserved = countBy(all.map((r) => r?.partnerCode));

  const hasStatusField = all.some((r) => r && Object.prototype.hasOwnProperty.call(r, 'status'));

  const currencyObserved = countBy(all.map((r) => r?.price?.currency));
  const totalPaid = all.map((r) => safeNumber(r?.stats?._f_totalPaid)).filter((n) => n !== null);

  const observedPaths = new Set();
  for (const r of all.slice(0, Math.min(20, all.length))) {
    flattenPaths(r, '', observedPaths, { maxArrayItems: 20 });
  }

  const md = [];
  md.push(`# Stays API — reservations export (direto) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Extrair direto do endpoint da Stays (fonte de verdade) para validar campos reais e evitar “achismo” baseado só no nosso banco.');
  md.push('');
  md.push('## Como foi extraído');
  md.push(`- Endpoint: \`${endpoint}\``);
  md.push(`- Base URL: \`${baseUrl}\``);
  md.push(`- Query: \`from=${from}\`, \`to=${to}\`, \`dateType=${dateType}\``);
  md.push(`- Types: ${types.map((t) => `\`${t}\``).join(', ')}`);
  md.push(`- Paginação: \`limit=${limit}\`, \`maxPages=${maxPages}\`, \`startSkip=${startSkip}\``);
  md.push('');
  md.push('## Saída');
  md.push(`- Raw JSON: \`${path.relative(repoRoot, rawJsonPath).replace(/\\/g, '/')}\``);
  if (singleJsonPath) md.push(`- Reserva(s) específica(s): \`${path.relative(repoRoot, singleJsonPath).replace(/\\/g, '/')}\``);
  md.push(`- Meta: \`${path.relative(repoRoot, metaPath).replace(/\\/g, '/')}\``);
  md.push('');
  md.push('## Resultado');
  md.push(`- Fetched: **${all.length}**`);
  md.push(`- next.skip: **${skip}**`);
  md.push(`- next.hasMore: **${hasMore ? 'true' : 'false'}**`);
  md.push('');

  md.push('## Campos observados (alto nível)');
  md.push(`- Top-level keys (1ª reserva): ${topLevelKeys.slice(0, 60).map((k) => `\`${k}\``).join(', ')}${topLevelKeys.length > 60 ? ', …' : ''}`);
  md.push(`- Existe campo \`status\` no payload? **${hasStatusField ? 'SIM' : 'NÃO (nesta amostra)'}**`);
  md.push('');

  md.push('## Enum candidates (observado)');
  md.push('');
  md.push('### type');
  for (const [k, c] of typesObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### status');
  for (const [k, c] of statusObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### partner.name');
  for (const [k, c] of partnerNameObserved.slice(0, 25)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### partnerCode');
  for (const [k, c] of partnerCodeObserved.slice(0, 25)) md.push(`- ${k}: ${c}`);
  md.push('');

  md.push('## price / stats (observado)');
  md.push(`- price.currency: ${currencyObserved.slice(0, 10).map(([k, c]) => `${k} (${c})`).join(', ') || '(vazio)'}`);
  if (totalPaid.length) {
    md.push(`- stats._f_totalPaid: min=${Math.min(...totalPaid)} max=${Math.max(...totalPaid)} (amostra com ${totalPaid.length} valores numéricos)`);
  } else {
    md.push('- stats._f_totalPaid: (nenhum valor numérico encontrado nesta amostra)');
  }
  md.push('');

  md.push('## Paths observados (amostra de até 20 reservas)');
  md.push('| path |');
  md.push('|---|');
  for (const p of Array.from(observedPaths).sort().slice(0, 400)) md.push(`| ${mdEscape(p)} |`);
  if (observedPaths.size > 400) md.push(`| … (${observedPaths.size - 400} paths omitidos) |`);
  md.push('');

  md.push('## Nota de segurança');
  md.push('- O arquivo raw pode conter dados pessoais (hóspedes). Evite commitar esses exports no GitHub; use apenas localmente para auditoria/mapeamento.');

  const docPath = path.join(docsDir, `STAYSNET_API_RESERVATIONS_EXPORT_${runId}.md`);
  fs.writeFileSync(docPath, md.join('\n'), 'utf8');

  console.log(`\nOK: wrote raw JSON to ${rawJsonPath}`);
  console.log(`OK: wrote doc to ${docPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
