import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Loads local secrets without printing them
dotenv.config({ path: '.env.local' });

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const val = process.argv[idx + 1];
  if (!val || val.startsWith('--')) return null;
  return val;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s) {
  return normalizeText(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function extractAmenitiesFromCatalog(tsText) {
  const result = {
    location: [],
    listing: [],
    allNamesNorm: new Set(),
    allIds: new Set(),
  };

  function extractConstBlock(constName) {
    const startIdx = tsText.indexOf(`export const ${constName}`);
    if (startIdx === -1) return null;
    const bracketStart = tsText.indexOf('[', startIdx);
    if (bracketStart === -1) return null;

    // Find matching closing ] for the top-level array
    let i = bracketStart;
    let depth = 0;
    for (; i < tsText.length; i++) {
      const ch = tsText[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          return tsText.slice(bracketStart, i + 1);
        }
      }
    }
    return null;
  }

  function extractAmenityObjectsFromAmenitiesArrays(blockText) {
    const out = [];
    let idx = 0;
    while (true) {
      const aIdx = blockText.indexOf('amenities:', idx);
      if (aIdx === -1) break;
      const arrayStart = blockText.indexOf('[', aIdx);
      if (arrayStart === -1) break;
      let i = arrayStart;
      let depth = 0;
      for (; i < blockText.length; i++) {
        const ch = blockText[i];
        if (ch === '[') depth++;
        else if (ch === ']') {
          depth--;
          if (depth === 0) break;
        }
      }
      const arrText = blockText.slice(arrayStart, i + 1);
      const re = /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'/g;
      for (const m of arrText.matchAll(re)) {
        out.push({ id: m[1], name: m[2] });
      }
      idx = i + 1;
    }
    return out;
  }

  const locBlock = extractConstBlock('LOCATION_AMENITIES') ?? '';
  const listBlock = extractConstBlock('LISTING_AMENITIES') ?? '';

  result.location = extractAmenityObjectsFromAmenitiesArrays(locBlock);
  result.listing = extractAmenityObjectsFromAmenitiesArrays(listBlock);

  for (const a of [...result.location, ...result.listing]) {
    result.allIds.add(a.id);
    result.allNamesNorm.add(normalizeText(a.name));
  }

  return result;
}

function pickNameFromStaysAmenity(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return null;
  if (typeof obj.name === 'string' && obj.name.trim()) return obj.name.trim();
  const msTitle = obj._mstitle || obj._msTitle || obj.mstitle;
  if (msTitle && typeof msTitle === 'object') {
    const pt = msTitle.pt_BR || msTitle.pt || msTitle['pt-BR'];
    if (typeof pt === 'string' && pt.trim()) return pt.trim();
    const en = msTitle.en_US || msTitle.en;
    if (typeof en === 'string' && en.trim()) return en.trim();
  }
  const title = obj.title;
  if (title && typeof title === 'object') {
    const pt = title.pt_BR || title.pt || title['pt-BR'];
    if (typeof pt === 'string' && pt.trim()) return pt.trim();
    const en = title.en_US || title.en;
    if (typeof en === 'string' && en.trim()) return en.trim();
  }
  return null;
}

function pickIdFromStaysAmenity(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj.trim() || null;
  return String(obj._id || obj.id || obj._i_id || '').trim() || null;
}

async function main() {
  const repoRoot = process.cwd();

  const listingKey = getArg('--listing') || getArg('--external') || null;
  const explicitOrgId = getArg('--organization') || null;
  const limit = Number(getArg('--limit') || '300');
  const writeReport = hasFlag('--write');

  const supabaseUrl =
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL in .env.local');
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const catalogPath = path.join(repoRoot, 'utils', 'amenities-categories.ts');
  const catalogText = fs.readFileSync(catalogPath, 'utf8');
  const catalog = extractAmenitiesFromCatalog(catalogText);

  async function restGet(restPath) {
    const url = `${supabaseUrl}${restPath}`;
    const resp = await fetch(url, { method: 'GET', headers });
    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Supabase REST ${resp.status}: ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
  }

  // Resolve organization_id + StaysNet external IDs when possible
  let organizationId = explicitOrgId;
  let staysnetListingId = null;
  let staysnetListingCode = null;
  let staysnetPropertyId = null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (listingKey && uuidRegex.test(listingKey)) {
    const q = `/rest/v1/anuncios_ultimate?select=organization_id,id,data&limit=1&id=eq.${encodeURIComponent(listingKey)}`;
    const rows = await restGet(q);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row?.organization_id) organizationId = row.organization_id;

    const data = row?.data;
    const externalIds = data?.externalIds;
    staysnetListingId = externalIds?.staysnet_listing_id ?? null;
    staysnetListingCode = externalIds?.staysnet_listing_code ?? null;
    staysnetPropertyId = externalIds?.staysnet_property_id ?? null;
  }

  // If the input isn't a UUID, treat it as a Stays identifier (listing_id / property_id / listing_code)
  if (listingKey && !uuidRegex.test(listingKey)) {
    staysnetListingId = listingKey;
    staysnetListingCode = listingKey;
    staysnetPropertyId = listingKey;
  }

  // Fetch relevant raw objects in a small number of targeted queries
  const rows = [];
  async function fetchRawWhere(params) {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${v}`);
    const qs = `${parts.join('&')}&select=domain,endpoint,external_id,external_code,payload&order=fetched_at.desc&limit=${limit}`;
    const raw = await restGet(`/rest/v1/staysnet_raw_objects?${qs}`);
    if (Array.isArray(raw)) rows.push(...raw);
  }

  const orgFilter = organizationId ? encodeURIComponent(organizationId) : null;

  // Broad scan mode: organization only
  if (orgFilter && !staysnetListingId && !staysnetListingCode && !staysnetPropertyId) {
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.listings',
    });
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.property-amenities',
    });
  }

  if (orgFilter && staysnetListingId) {
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.listings',
      external_id: `eq.${encodeURIComponent(staysnetListingId)}`,
    });
  }
  if (orgFilter && staysnetListingCode && staysnetListingCode !== staysnetListingId) {
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.listings',
      external_code: `eq.${encodeURIComponent(staysnetListingCode)}`,
    });
  }
  if (orgFilter && staysnetPropertyId) {
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.property-amenities',
      external_id: `eq.${encodeURIComponent(staysnetPropertyId)}`,
    });
  }

  // Some environments link property-amenities rows via external_code (listing code)
  if (orgFilter && staysnetListingCode) {
    await fetchRawWhere({
      organization_id: `eq.${orgFilter}`,
      domain: 'eq.property-amenities',
      external_code: `eq.${encodeURIComponent(staysnetListingCode)}`,
    });
  }

  // De-dupe by a stable key
  const uniq = new Map();
  for (const r of rows) {
    const key = `${r.domain}::${r.endpoint}::${r.external_id}::${r.external_code ?? ''}`;
    if (!uniq.has(key)) uniq.set(key, r);
  }
  const dedupedRows = Array.from(uniq.values());

  const staysListing = new Map(); // staysId -> name
  const staysLocation = new Map(); // staysId -> name

  for (const r of dedupedRows) {
    const payload = r?.payload;
    if (!payload) continue;

    if (r.domain === 'property-amenities') {
      const arr = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.amenities)
            ? payload.amenities
            : null;

      if (arr) {
        for (const item of arr) {
          const staysId = pickIdFromStaysAmenity(item);
          const name = pickNameFromStaysAmenity(item);
          if (!staysId) continue;
          if (!staysLocation.has(staysId)) staysLocation.set(staysId, name);
        }
      }
    }

    if (r.domain === 'listings') {
      const amenitiesArr = Array.isArray(payload?.amenities) ? payload.amenities : null;
      const metaArr = Array.isArray(payload?._t_amenitiesMeta) ? payload._t_amenitiesMeta : null;

      const propAmenitiesArr = Array.isArray(payload?.propertyAmenities) ? payload.propertyAmenities : null;
      const propAmenitiesMetaArr = Array.isArray(payload?._t_propertyAmenitiesMeta)
        ? payload._t_propertyAmenitiesMeta
        : null;

      for (const arr of [amenitiesArr, metaArr]) {
        if (!arr) continue;
        for (const item of arr) {
          const staysId = pickIdFromStaysAmenity(item);
          const name = pickNameFromStaysAmenity(item);
          if (!staysId) continue;
          if (!staysListing.has(staysId)) staysListing.set(staysId, name);
        }
      }

      for (const arr of [propAmenitiesArr, propAmenitiesMetaArr]) {
        if (!arr) continue;
        for (const item of arr) {
          const staysId = pickIdFromStaysAmenity(item);
          const name = pickNameFromStaysAmenity(item);
          if (!staysId) continue;
          if (!staysLocation.has(staysId)) staysLocation.set(staysId, name);
        }
      }
    }
  }

  function computeUnknown(staysMap) {
    const unknown = [];
    const usedSuggestedIds = new Set(catalog.allIds);

    for (const [staysId, name] of staysMap.entries()) {
      if (!name) continue; // only actionable items
      const normName = normalizeText(name);
      if (catalog.allNamesNorm.has(normName)) continue;

      let suggestedId = slugify(name);
      if (!suggestedId) continue;
      if (usedSuggestedIds.has(suggestedId)) {
        let n = 2;
        while (usedSuggestedIds.has(`${suggestedId}-${n}`)) n++;
        suggestedId = `${suggestedId}-${n}`;
      }
      usedSuggestedIds.add(suggestedId);

      unknown.push({ staysId, name, suggestedId });
    }

    unknown.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return unknown;
  }

  const unknownLocation = computeUnknown(staysLocation);
  const unknownListing = computeUnknown(staysListing);

  const output = {
    filters: {
      listingKey: listingKey ?? null,
      organizationId: organizationId ?? null,
      limit,
      staysnetListingId,
      staysnetListingCode,
      staysnetPropertyId,
    },
    totals: {
      rawRows: dedupedRows.length,
      staysLocationCount: staysLocation.size,
      staysListingCount: staysListing.size,
      unknownLocationCount: unknownLocation.length,
      unknownListingCount: unknownListing.length,
    },
    unknownLocation,
    unknownListing,
  };

  if (writeReport) {
    const lines = [];
    lines.push(`# StaysNet Unknown Amenities Report`);
    lines.push('');
    lines.push(`- listingKey: ${output.filters.listingKey ?? '(none)'}`);
    lines.push(`- organizationId: ${output.filters.organizationId ?? '(unknown)'}`);
    lines.push(`- rawRows scanned: ${output.totals.rawRows}`);
    lines.push('');

    lines.push(`## Location (property amenities) — missing in catalog: ${output.totals.unknownLocationCount}`);
    for (const a of unknownLocation) {
      lines.push(`- ${a.name} | staysId=${a.staysId} | suggestedId=${a.suggestedId}`);
    }
    lines.push('');

    lines.push(`## Listing (accommodation amenities) — missing in catalog: ${output.totals.unknownListingCount}`);
    for (const a of unknownListing) {
      lines.push(`- ${a.name} | staysId=${a.staysId} | suggestedId=${a.suggestedId}`);
    }

    const reportPath = path.join(repoRoot, '_tmp_staysnet_unknown_amenities_report.md');
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  }

  // Print JSON to stdout for tooling
  console.log(JSON.stringify(output, null, 2));
}

await main();
