#!/usr/bin/env node
/**
 * Generates a real-data-driven reconciliation report (CSV + Markdown)
 * using Supabase Edge Function: /data-reconciliation/real-samples
 *
 * No mocks, no external deps.
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

function readEnvFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[\r\n,\"]/g.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(str1, str2) {
  const s1 = String(str1 || '');
  const s2 = String(str2 || '');
  const len1 = s1.length;
  const len2 = s2.length;

  const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function extractKeywords(fieldName, fieldLabel) {
  const combined = `${fieldName || ''} ${fieldLabel || ''}`;
  const normalized = normalizeString(combined);
  return normalized.split(' ').filter((w) => w.length > 2);
}

function areTypesCompatible(rendizyType, platformType) {
  const typeMap = {
    text: ['string', 'text'],
    number: ['number', 'integer', 'float', 'decimal'],
    date: ['date', 'datetime', 'timestamp'],
    boolean: ['boolean', 'bool'],
    object: ['object', 'json'],
    array: ['array', 'list'],
  };
  const compatibleTypes = typeMap[rendizyType] || [];
  const pt = String(platformType || '').toLowerCase();
  return compatibleTypes.includes(pt) || String(rendizyType || '') === String(platformType || '');
}

function calculateSimilarityScore(rendizyField, platformField) {
  let score = 0;

  // 1) nome (40)
  const rendizyName = normalizeString(rendizyField.name);
  const platformName = normalizeString(platformField.name);
  if (rendizyName === platformName) {
    score += 40;
  } else {
    const distance = levenshteinDistance(rendizyName, platformName);
    const maxLen = Math.max(rendizyName.length, platformName.length) || 1;
    const similarity = 1 - distance / maxLen;
    score += similarity * 40;
  }

  // 2) label (30)
  const rendizyLabel = normalizeString(rendizyField.label);
  const platformLabel = normalizeString(platformField.label);
  const labelDistance = levenshteinDistance(rendizyLabel, platformLabel);
  const labelMaxLen = Math.max(rendizyLabel.length, platformLabel.length) || 1;
  const labelSimilarity = 1 - labelDistance / labelMaxLen;
  score += labelSimilarity * 30;

  // 3) keywords (20)
  const rendizyKeywords = extractKeywords(rendizyField.name, rendizyField.label);
  const platformKeywords = extractKeywords(platformField.name, platformField.label);
  const commonKeywords = rendizyKeywords.filter((kw) =>
    platformKeywords.some((pkw) => pkw.includes(kw) || kw.includes(pkw))
  );
  if (rendizyKeywords.length > 0 && platformKeywords.length > 0) {
    const keywordScore = (commonKeywords.length / Math.max(rendizyKeywords.length, platformKeywords.length)) * 20;
    score += keywordScore;
  }

  // 4) type (10)
  if (areTypesCompatible(rendizyField.type, platformField.type)) score += 10;

  // 5) category boost (+8)
  if (platformField.category && rendizyField.category === platformField.category) score += 8;

  return Math.min(100, Math.round(score));
}

function confidenceFromScore(score) {
  if (score >= 88) return 'high';
  if (score >= 72) return 'medium';
  return 'low';
}

function sourceFromDescription(desc) {
  const d = String(desc || '').toLowerCase();
  if (d.includes('supabase reservations')) return 'Supabase: reservations';
  if (d.includes('supabase guests')) return 'Supabase: guests';
  if (d.includes('supabase anuncios_ultimate')) return 'Supabase: anuncios_ultimate';
  if (d.includes('supabase anuncios_drafts')) return 'Supabase: anuncios_drafts';
  if (d.includes('stays /booking/reservations')) return 'Stays: /booking/reservations';
  if (d.includes('stays /content/properties')) return 'Stays: /content/properties';
  return desc ? `Fonte: ${desc}` : '';
}

function contextHints(field) {
  const name = normalizeString(field.name);
  const label = normalizeString(field.label);
  const text = `${name} ${label}`;

  const hints = [];
  // Prefixos do Rendizy que já dizem muito sobre contexto
  if (name.startsWith('data.staysnet_raw.')) {
    hints.push('Campo dentro do JSON bruto da Stays (staysnet_raw)');
  }
  if (name.startsWith('data.staysnet_raw._t_typemeta') || name.includes('_t_typemeta')) {
    hints.push('Metadados de tipo/idioma (provavelmente não é campo de negócio)');
  }
  if (text.includes('internalname') || text.includes('internal name')) hints.push('Identificação interna / nome interno do imóvel');
  if (text.includes('checkin') || text.includes('arrival')) hints.push('Check-in / chegada');
  if (text.includes('checkout') || text.includes('departure')) hints.push('Check-out / saída');
  if (text.includes('guest') || text.includes('client') || text.includes('customer')) hints.push('Hóspede / cliente');
  if (text.includes('email')) hints.push('Email');
  if (text.includes('phone') || text.includes('telefone')) hints.push('Telefone');
  if (text.includes('price') || text.includes('amount') || text.includes('total')) hints.push('Valor / total / preço');
  if (text.includes('id') && !hints.some((h) => h.toLowerCase().includes('id'))) hints.push('Identificador');

  const example = String(field.example || '');
  if (example.includes('@') && !hints.includes('Email')) hints.push('Parece email pelo exemplo');
  if (/^\d{4}-\d{2}-\d{2}/.test(example)) hints.push('Parece data pelo exemplo');

  return hints.join('; ');
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = path.resolve(process.cwd());
  const envLocal = readEnvFileIfExists(path.join(repoRoot, '.env.local'));
  const env = { ...envLocal, ...process.env };

  const apiBaseUrl =
    args['--base-url'] ||
    env.VITE_API_BASE_URL ||
    'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server';

  const organizationId = args['--org'] || env.ORGANIZATION_ID || '00000000-0000-0000-0000-000000000000';
  const startDate = args['--start'];
  const endDate = args['--end'];
  const limit = Number(args['--limit'] || 25);

  if (!startDate || !endDate) {
    console.error('Usage: node scripts/generate-data-reconciliation-report.mjs --start YYYY-MM-DD --end YYYY-MM-DD [--limit 25] [--org <uuid>] [--property CD08J,CI01J]');
    process.exit(1);
  }

  const propertyArg = args['--property'] || args['--properties'] || '';
  const propertyIds = String(propertyArg)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Auth strategy:
  // - Prefer service role (local) to avoid needing browser token.
  // - Otherwise use anon key + X-Auth-Token passed by user.
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  const xAuthToken = args['--x-auth-token'] || env.RENDIZY_TOKEN;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (serviceRole) {
    headers.Authorization = `Bearer ${serviceRole}`;
    headers.apikey = serviceRole;
  } else {
    if (!anonKey) {
      console.error('Missing anon key. Provide VITE_SUPABASE_ANON_KEY in .env.local or pass --base-url pointing to your proxy.');
      process.exit(1);
    }
    headers.Authorization = `Bearer ${anonKey}`;
    headers.apikey = anonKey;
    if (!xAuthToken) {
      console.error('Missing X-Auth-Token. Pass --x-auth-token <rendizy-token> (you can copy it from localStorage.getItem("rendizy-token")).');
      process.exit(1);
    }
    headers['X-Auth-Token'] = xAuthToken;
  }

  const url = new URL(`${apiBaseUrl.replace(/\/$/, '')}/data-reconciliation/real-samples`);
  // When using service role, we can explicitly set organization_id.
  url.searchParams.set('organization_id', organizationId);

  const body = {
    startDate,
    endDate,
    propertyIds,
    limit,
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payloadText = await res.text();
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    console.error('Non-JSON response:', payloadText.slice(0, 400));
    process.exit(1);
  }

  if (!res.ok || !payload?.success) {
    console.error(`Request failed: status=${res.status} body=${payloadText.slice(0, 800)}`);
    process.exit(1);
  }

  const platformFields = payload?.data?.platform?.fields || [];
  const rendizyFieldsRaw = payload?.data?.rendizy?.fields || [];

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const outDir = args['--out-dir'] || path.join(repoRoot, '_reports');
  ensureDir(outDir);

  const baseName = `data-reconciliation-report_${startDate}_to_${endDate}_${stamp}`;
  const csvPath = path.join(outDir, `${baseName}.csv`);
  const mdPath = path.join(outDir, `${baseName}.md`);

  // Dedup de campos Rendizy (muitas tabelas podem ter campos iguais como "status", "id", etc.)
  // A chave usa name+category+source para manter diferenças reais.
  const rendizyFields = dedupeBy(rendizyFieldsRaw, (f) => {
    const src = sourceFromDescription(f?.description);
    return `${String(f?.name || '')}::${String(f?.category || '')}::${src}`;
  });

  // Build suggestions: for each Rendizy field, pick best platform match.
  const rows = [];
  for (const rf of rendizyFields) {
    let best = null;
    for (const pf of platformFields) {
      const score = calculateSimilarityScore(rf, pf);
      if (!best || score > best.score) best = { pf, score };
    }

    const suggested = best?.pf || null;
    const score = best?.score ?? 0;

    const rfSource = sourceFromDescription(rf.description);
    const pfSource = suggested ? sourceFromDescription(suggested.description) : '';

    rows.push({
      status: '',
      notes: '',
      rendizy_category: rf.category,
      rendizy_field: rf.name,
      rendizy_label: rf.label,
      rendizy_type: rf.type,
      rendizy_example: rf.example || '',
      rendizy_source: rfSource,
      rendizy_context: contextHints(rf),
      platform_category: suggested?.category || '',
      platform_field: suggested?.name || '',
      platform_label: suggested?.label || '',
      platform_type: suggested?.type || '',
      platform_example: suggested?.example || '',
      platform_source: pfSource,
      platform_context: suggested ? contextHints(suggested) : '',
      similarity_score: score,
      confidence: confidenceFromScore(score),
    });
  }

  // Sort by confidence then score desc.
  rows.sort((a, b) => {
    const weight = (c) => (c === 'high' ? 3 : c === 'medium' ? 2 : 1);
    const dw = weight(b.confidence) - weight(a.confidence);
    if (dw !== 0) return dw;
    return (b.similarity_score || 0) - (a.similarity_score || 0);
  });

  const headersCsv = [
    'status',
    'notes',
    'rendizy_category',
    'rendizy_field',
    'rendizy_label',
    'rendizy_type',
    'rendizy_example',
    'rendizy_source',
    'rendizy_context',
    'platform_category',
    'platform_field',
    'platform_label',
    'platform_type',
    'platform_example',
    'platform_source',
    'platform_context',
    'similarity_score',
    'confidence',
  ];

  const csvLines = [headersCsv.join(',')];
  for (const r of rows) {
    csvLines.push(headersCsv.map((h) => csvEscape(r[h])).join(','));
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

  // Markdown report (scan-friendly)
  const md = [];
  md.push(`# Data Reconciliation Report`);
  md.push('');
  md.push(`- Period: ${startDate} → ${endDate}`);
  md.push(`- Organization: ${organizationId}`);
  md.push(`- Properties filter: ${propertyIds.length ? propertyIds.join(', ') : '(all)'}`);
  md.push(`- Fields: Rendizy=${rendizyFields.length} | Platform=${platformFields.length}`);
  md.push('');
  md.push('## How to review');
  md.push('- In the CSV, fill `status` with: CONFIRMED / REJECTED / NEEDS_RESEARCH');
  md.push('- Add your notes in `notes` (what you discovered, links, rules).');
  md.push('');
  md.push('## Auto-suggested mappings (top 120 by score)');
  md.push('');
  md.push('| Score | Conf | Rendizy field | Platform field | Context (Rendizy → Platform) |');
  md.push('|---:|:---:|---|---|---|');

  // No Markdown, reduzir ruído: ignorar duplicatas óbvias de sugestões e campos muito genéricos.
  const mdRows = dedupeBy(
    rows
      .filter((r) => {
        const rn = String(r.rendizy_field || '').trim().toLowerCase();
        // mantém "id" mas corta repetição excessiva de campos genéricos
        if (rn === 'status' && String(r.rendizy_source || '').toLowerCase().includes('supabase')) return false;
        return true;
      })
      .slice(0, 250),
    (r) => `${r.rendizy_field}=>${r.platform_field}`
  ).slice(0, 120);

  for (const r of mdRows) {
    const rf = `${r.rendizy_field} (${r.rendizy_type})`;
    const pf = r.platform_field ? `${r.platform_field} (${r.platform_type})` : '(no match)';
    const ctx = `${r.rendizy_context || ''}${r.platform_context ? ` → ${r.platform_context}` : ''}`.trim();
    md.push(`| ${r.similarity_score} | ${r.confidence} | ${rf} | ${pf} | ${ctx || ''} |`);
  }

  md.push('');
  md.push('## Field sources');
  md.push('');
  md.push('- Rendizy sources are inferred from `description` returned by the API (e.g., Supabase tables).');
  md.push('- Platform sources are inferred from Stays endpoints used in the API (e.g., /content/properties, /booking/reservations).');
  md.push('');

  fs.writeFileSync(mdPath, md.join('\n'), 'utf8');

  console.log('OK');
  console.log(`CSV: ${csvPath}`);
  console.log(`MD : ${mdPath}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
