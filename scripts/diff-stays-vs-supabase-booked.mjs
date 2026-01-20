import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

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

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ''
  ).trim();
}

function getSupabaseAnonKey() {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
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

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function stableKeySetForReservationRow(row) {
  // Keep flexible: different schemas exist across branches.
  const candidates = [
    row?.external_id,
    row?.staysnet_id,
    row?.staysnet_reservation_code,
    row?.staysnet_partner_code,
    row?.id,
  ];
  return uniq(candidates.map((v) => (v === null || v === undefined ? null : String(v).trim())).filter(Boolean));
}

function staysPrimaryId(r) {
  // Prefer the long Stays _id.
  const candidates = [r?._id, r?.id, r?.partnerCode];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
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

async function fetchAllStaysReservations({ baseUrl, apiKey, apiSecret, from, to, dateType, types, limit }) {
  const endpoint = '/booking/reservations';
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');

  const all = [];
  let skip = 0;

  // Stays API uses skip/limit.
  // Stop when a page returns fewer than limit.
  for (let page = 0; page < 500; page += 1) {
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
      return { all, next: { skip: skip + pageData.length, hasMore: false } };
    }

    skip += limit;
  }

  return { all, next: { skip, hasMore: true } };
}

async function fetchSupabaseReservations({ from, to, useServiceRole }) {
  const supabaseUrl = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
  const key = useServiceRole ? serviceKey : anon;
  if (!key) throw new Error(useServiceRole ? 'Missing SUPABASE_SERVICE_ROLE_KEY' : 'Missing SUPABASE_ANON_KEY');

  const client = createClient(supabaseUrl, key);

  // Pull minimal fields; keep staysnet_raw to check the source type.
  // This repo has had multiple schema variants, so we probe/select columns defensively.
  const pageSize = 1000;
  let fromIdx = 0;
  const rows = [];

  const desiredColumns = [
    'id',
    'external_id',
    'staysnet_id',
    'staysnet_reservation_code',
    'staysnet_partner_code',
    'check_in',
    'check_out',
    'status',
    'staysnet_raw',
  ];

  async function selectWithSchemaFallback(rangeFrom, rangeTo) {
    let cols = [...desiredColumns];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { data, error } = await client
        .from('reservations')
        .select(cols.join(','))
        .gte('check_in', from)
        .lte('check_in', to)
        .range(rangeFrom, rangeTo);

      if (!error) return { data: data || [], colsUsed: cols };

      const msg = String(error.message || '');
      const m = msg.match(/column\s+([a-zA-Z0-9_]+)\.?([a-zA-Z0-9_]+)?\s+does not exist/i);
      // Supabase often returns: "column reservations.staysnet_id does not exist"
      const m2 = msg.match(/column\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s+does not exist/i);
      const missingCol = m2 ? m2[2] : m ? m[2] || m[1] : null;

      if (!missingCol) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      const nextCols = cols.filter((c) => c !== missingCol);
      if (nextCols.length === cols.length) {
        throw new Error(`Supabase query failed (missing col '${missingCol}'): ${error.message}`);
      }
      cols = nextCols;
    }

    throw new Error('Supabase query failed: too many schema fallback attempts');
  }

  for (let iter = 0; iter < 100; iter += 1) {
    const toIdx = fromIdx + pageSize - 1;

    const { data } = await selectWithSchemaFallback(fromIdx, toIdx);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;

    fromIdx += pageSize;
  }

  return rows;
}

function safeTypeFromRow(row) {
  const raw = row?.staysnet_raw;
  if (!raw || typeof raw !== 'object') return null;
  const t = raw.type;
  return t ? String(t) : null;
}

async function main() {
  loadEnvFile();

  const args = parseArgs(process.argv.slice(2));

  const from = String(args.from || '2025-12-01').trim();
  const to = String(args.to || '2026-04-30').trim();
  const dateType = String(args.dateType || 'arrival').trim();
  const limit = Math.min(50, Math.max(1, Number(args.limit || 50)));

  const types = String(args.types || 'booked')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const useServiceRole = args.serviceRole === true || String(args.serviceRole || '') === '1';

  const staysBaseUrl = normalizeBaseUrl(process.env.STAYSNET_BASE_URL || 'https://bvm.stays.net/external/v1');
  let apiKey = String(process.env.STAYSNET_API_KEY || '').trim();
  let apiSecret = String(process.env.STAYSNET_API_SECRET || '').trim();
  if (!apiKey || !apiSecret) {
    const cfg = await tryLoadStaysConfigFromSupabase();
    if (!cfg?.apiKey || !cfg?.apiSecret) {
      throw new Error('Missing STAYSNET_API_KEY/STAYSNET_API_SECRET and could not load from staysnet_config (service role).');
    }
    apiKey = cfg.apiKey;
    apiSecret = cfg.apiSecret;
  }

  console.log(`Diff: Stays vs Supabase | from=${from} to=${to} dateType=${dateType} types=${types.join(',')}`);

  const { all: staysAll } = await fetchAllStaysReservations({
    baseUrl: staysBaseUrl,
    apiKey,
    apiSecret,
    from,
    to,
    dateType,
    types,
    limit,
  });

  const staysUniqueIds = uniq(staysAll.map(staysPrimaryId).filter(Boolean));

  const supaRows = await fetchSupabaseReservations({ from, to, useServiceRole });

  const supaBookedRows = supaRows.filter((r) => {
    const t = safeTypeFromRow(r);
    return t && types.includes(String(t));
  });

  const supaKeyToRow = new Map();
  for (const r of supaBookedRows) {
    for (const k of stableKeySetForReservationRow(r)) {
      if (!supaKeyToRow.has(k)) supaKeyToRow.set(k, r);
    }
  }

  const missingInSupabase = [];
  for (const sid of staysUniqueIds) {
    if (!supaKeyToRow.has(sid)) missingInSupabase.push(sid);
  }

  const extraInSupabase = [];
  const staysSet = new Set(staysUniqueIds);
  for (const [k] of supaKeyToRow.entries()) {
    if (!staysSet.has(k)) extraInSupabase.push(k);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    query: { from, to, dateType, types, limit },
    stays: {
      fetched: staysAll.length,
      uniqueIds: staysUniqueIds.length,
    },
    supabase: {
      fetchedInRange: supaRows.length,
      bookedLikeCount: supaBookedRows.length,
      uniqueKeysObserved: supaKeyToRow.size,
    },
    diff: {
      missingInSupabaseCount: missingInSupabase.length,
      missingInSupabase,
      extraInSupabaseCount: extraInSupabase.length,
      extraInSupabase: extraInSupabase.slice(0, 50),
    },
  };

  const runId = runIdFromNow();
  const outDir = path.resolve(repoRoot, '_reports', 'diffs', `stays-vs-supabase-${runId}`);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

  // Keep console output minimal (no guest names).
  console.log(`Stays: fetched=${report.stays.fetched} uniqueIds=${report.stays.uniqueIds}`);
  console.log(`Supabase: inRange=${report.supabase.fetchedInRange} bookedLike=${report.supabase.bookedLikeCount}`);
  console.log(`Missing in Supabase: ${report.diff.missingInSupabaseCount}`);
  if (report.diff.missingInSupabaseCount <= 20) {
    for (const id of report.diff.missingInSupabase) console.log(`  - ${id}`);
  } else {
    console.log(`  (see report.json for full list)`);
  }

  console.log(`\nOK: wrote report to ${path.relative(repoRoot, outDir).replace(/\\/g, '/')}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
