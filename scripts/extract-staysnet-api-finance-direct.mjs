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

function toYmd(d) {
  return d.toISOString().split('T')[0];
}

function parseYmd(s) {
  const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function addDays(d, days) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function runIdFromNow() {
  const s = new Date().toISOString();
  return s.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
}

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

async function fetchJson({ baseUrl, endpoint, credentials, params }) {
  const qp = params ? `?${new URLSearchParams(params)}` : '';
  const url = `${baseUrl}${endpoint}${qp}`;
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

  return res.json();
}

function safeArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  return [v];
}

function tryFindLatestExportDir(prefix) {
  const base = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');
  if (!fs.existsSync(base)) return null;
  const children = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(prefix));
  if (!children.length) return null;

  const withTime = children
    .map((d) => {
      const full = path.join(base, d.name);
      const st = fs.statSync(full);
      return { full, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return withTime[0]?.full || null;
}

function loadReservationIdsFromExport({ reservationsRawPath, reservationsExportDir, maxIds }) {
  const resolvedRawPath = reservationsRawPath
    ? path.resolve(repoRoot, reservationsRawPath)
    : reservationsExportDir
      ? path.resolve(repoRoot, reservationsExportDir, 'reservations_raw.json')
      : null;

  if (resolvedRawPath && fs.existsSync(resolvedRawPath)) {
    const raw = JSON.parse(fs.readFileSync(resolvedRawPath, 'utf8'));
    if (Array.isArray(raw)) {
      return raw.map((r) => r?._id).filter(Boolean).slice(0, maxIds);
    }
  }

  const latestDir = tryFindLatestExportDir('reservations-');
  if (!latestDir) return [];
  const fallback = path.join(latestDir, 'reservations_raw.json');
  if (!fs.existsSync(fallback)) return [];
  const raw = JSON.parse(fs.readFileSync(fallback, 'utf8'));
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => r?._id).filter(Boolean).slice(0, maxIds);
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

  // Defaults: safe range well under 1 year (API returns 422 if > 1 year)
  const toDefault = new Date();
  const fromDefault = addDays(new Date(Date.UTC(toDefault.getUTCFullYear(), toDefault.getUTCMonth(), toDefault.getUTCDate())), -360);

  let from = String(args.from || toYmd(fromDefault)).trim();
  let to = String(args.to || toYmd(toDefault)).trim();

  const fromD = parseYmd(from);
  const toD = parseYmd(to);
  if (fromD && toD) {
    const diffDays = daysBetween(fromD, toD);
    if (diffDays > 365) {
      const clampedFrom = toYmd(addDays(toD, -365));
      console.log(
        `Info: clamping date range for finance endpoints (diffDays=${diffDays}) to satisfy API limit: from=${clampedFrom} to=${to}`
      );
      from = clampedFrom;
    }
  }

  const paymentProvidersStatus = String(args.paymentProvidersStatus || args.status || '').trim();
  const sampleOwnerDetails = Math.max(0, Number(args.sampleOwnerDetails || 0));
  const sampleReservationPayments = Math.max(0, Number(args.sampleReservationPayments || 0));
  const reservationsRawPath = String(args.reservationsRawPath || '').trim();
  const reservationsExportDir = String(args.reservationsExportDir || '').trim();

  const runId = runIdFromNow();
  const outRoot = path.resolve(repoRoot, '_reports', 'staysnet-api-exports');
  const exportDir = path.join(outRoot, `finance-${runId}`);
  fs.mkdirSync(exportDir, { recursive: true });

  const docsDir = path.resolve(repoRoot, 'docs', '05-operations');
  fs.mkdirSync(docsDir, { recursive: true });

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

  // 1) Payment providers
  const paymentProvidersEndpoint = '/finance/payment-providers';
  const paymentProvidersParams = {};
  if (paymentProvidersStatus) paymentProvidersParams.status = paymentProvidersStatus;
  const paymentProviders = await fetchJson({
    baseUrl,
    endpoint: paymentProvidersEndpoint,
    credentials,
    params: Object.keys(paymentProvidersParams).length ? paymentProvidersParams : null,
  });
  const paymentProvidersRawPath = path.join(exportDir, 'payment_providers_raw.json');
  fs.writeFileSync(paymentProvidersRawPath, JSON.stringify(paymentProviders, null, 2), 'utf8');

  // 2) Owners summary (required from/to)
  const ownersEndpoint = '/finance/owners';
  const owners = await fetchJson({
    baseUrl,
    endpoint: ownersEndpoint,
    credentials,
    params: { from, to },
  });
  const ownersRawPath = path.join(exportDir, 'owners_raw.json');
  fs.writeFileSync(ownersRawPath, JSON.stringify(owners, null, 2), 'utf8');

  // 3) Owner details sample
  const ownersArr = safeArray(owners);
  const ownerDetailsSamples = [];
  if (sampleOwnerDetails > 0) {
    for (const o of ownersArr.slice(0, sampleOwnerDetails)) {
      const ownerId = o?._id;
      if (!ownerId) continue;
      const endpoint = `/finance/owners/${encodeURIComponent(String(ownerId))}`;
      try {
        const data = await fetchJson({
          baseUrl,
          endpoint,
          credentials,
          params: { from, to },
        });
        ownerDetailsSamples.push({ ownerId, ok: true, data });
      } catch (e) {
        ownerDetailsSamples.push({ ownerId, ok: false, error: String(e?.message || e) });
      }
    }
  }
  const ownerDetailsSamplePath = path.join(exportDir, 'owner_details_samples.json');
  fs.writeFileSync(ownerDetailsSamplePath, JSON.stringify(ownerDetailsSamples, null, 2), 'utf8');

  // 4) Reservation payments sample (requires reservationIds)
  const reservationPaymentsSamples = [];
  if (sampleReservationPayments > 0) {
    const reservationIds = loadReservationIdsFromExport({
      reservationsRawPath: reservationsRawPath || null,
      reservationsExportDir: reservationsExportDir || null,
      maxIds: sampleReservationPayments,
    });

    for (const reservationId of reservationIds) {
      const endpoint = `/booking/reservations/${encodeURIComponent(String(reservationId))}/payments`;
      try {
        const data = await fetchJson({ baseUrl, endpoint, credentials, params: null });
        reservationPaymentsSamples.push({ reservationId, ok: true, data });
      } catch (e) {
        reservationPaymentsSamples.push({ reservationId, ok: false, error: String(e?.message || e) });
      }
    }
  }
  const reservationPaymentsSamplePath = path.join(exportDir, 'reservation_payments_samples.json');
  fs.writeFileSync(reservationPaymentsSamplePath, JSON.stringify(reservationPaymentsSamples, null, 2), 'utf8');

  const meta = {
    runId,
    generatedAt: new Date().toISOString(),
    stays: {
      baseUrl,
      endpoints: {
        paymentProviders: paymentProvidersEndpoint,
        owners: ownersEndpoint,
        ownerDetails: '/finance/owners/{ownerId}',
        reservationPayments: '/booking/reservations/{reservationId}/payments',
      },
    },
    query: {
      from,
      to,
      paymentProvidersStatus: paymentProvidersStatus || null,
      sampleOwnerDetails,
      sampleReservationPayments,
      reservationsExportDir: reservationsExportDir || null,
      reservationsRawPath: reservationsRawPath || null,
    },
    outputs: {
      paymentProvidersRawPath,
      ownersRawPath,
      ownerDetailsSamplePath,
      reservationPaymentsSamplePath,
    },
  };
  const metaPath = path.join(exportDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Summary analysis (no PII values printed)
  const observedPaths = new Set();
  flattenPaths(paymentProviders, 'paymentProviders', observedPaths, { maxArrayItems: 20 });
  flattenPaths(owners, 'owners', observedPaths, { maxArrayItems: 20 });
  for (const s of ownerDetailsSamples.slice(0, Math.min(10, ownerDetailsSamples.length))) {
    if (s?.ok && s?.data) flattenPaths(s.data, 'ownerDetails', observedPaths, { maxArrayItems: 20 });
  }
  for (const s of reservationPaymentsSamples.slice(0, Math.min(10, reservationPaymentsSamples.length))) {
    if (s?.ok && s?.data) flattenPaths(s.data, 'reservationPayments', observedPaths, { maxArrayItems: 20 });
  }

  const providersArr = safeArray(paymentProviders);
  const providerTypeObserved = countBy(providersArr.map((p) => p?.type));
  const providerStatusObserved = countBy(providersArr.map((p) => p?.status));

  const ownersStatusObserved = countBy(ownerDetailsSamples.map((o) => (o?.ok ? o?.data?.status : null)));

  const md = [];
  md.push(`# Stays API — finance export (direto) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Extrair dados financeiros direto da Stays (fonte de verdade) para mapear campos reais de owners/provedores/pagamentos.');
  md.push('');
  md.push('## Como foi extraído');
  md.push(`- Base URL: \`${baseUrl}\``);
  md.push(`- Período (owners): \`from=${from}\`, \`to=${to}\``);
  md.push(`- payment-providers.status: \`${paymentProvidersStatus || '(vazio)'}\``);
  md.push(`- sampleOwnerDetails: **${sampleOwnerDetails}**`);
  md.push(`- sampleReservationPayments: **${sampleReservationPayments}**`);
  md.push('');
  md.push('## Saída');
  md.push(`- payment_providers raw: \`${path.relative(repoRoot, paymentProvidersRawPath).replace(/\\/g, '/')}\``);
  md.push(`- owners raw: \`${path.relative(repoRoot, ownersRawPath).replace(/\\/g, '/')}\``);
  md.push(`- owner details sample: \`${path.relative(repoRoot, ownerDetailsSamplePath).replace(/\\/g, '/')}\``);
  md.push(`- reservation payments sample: \`${path.relative(repoRoot, reservationPaymentsSamplePath).replace(/\\/g, '/')}\``);
  md.push(`- Meta: \`${path.relative(repoRoot, metaPath).replace(/\\/g, '/')}\``);
  md.push('');
  md.push('## Resultado');
  md.push(`- payment providers: **${providersArr.length}**`);
  md.push(`- owners: **${ownersArr.length}**`);
  md.push(`- owner details sampled: **${ownerDetailsSamples.length}**`);
  md.push(`- reservation payments sampled: **${reservationPaymentsSamples.length}**`);
  md.push('');
  md.push('## Enum candidates (observado)');
  md.push('');
  md.push('### payment-providers.type');
  for (const [k, c] of providerTypeObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### payment-providers.status');
  for (const [k, c] of providerStatusObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('### owners/{ownerId}.status (amostra)');
  for (const [k, c] of ownersStatusObserved.slice(0, 20)) md.push(`- ${k}: ${c}`);
  md.push('');
  md.push('## Paths observados (amostra)');
  md.push('| path |');
  md.push('|---|');
  for (const p of Array.from(observedPaths).sort().slice(0, 500)) md.push(`| ${mdEscape(p)} |`);
  if (observedPaths.size > 500) md.push(`| … (${observedPaths.size - 500} paths omitidos) |`);
  md.push('');
  md.push('## Nota de segurança');
  md.push('- Exports podem conter informações financeiras e dados pessoais (nomes/notas). Evite commitar `_reports/`.' );

  const docPath = path.join(docsDir, `STAYSNET_API_FINANCE_EXPORT_${runId}.md`);
  fs.writeFileSync(docPath, md.join('\n'), 'utf8');

  console.log(`\nOK: wrote finance exports to ${exportDir}`);
  console.log(`OK: wrote doc to ${docPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
