import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.resolve(repoRoot, 'docs', '05-operations');

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
  return String(s ?? '').replace(/\|/g, '\\|');
}

function listDocsMatching(prefix, contains) {
  if (!fs.existsSync(docsDir)) return [];
  return fs
    .readdirSync(docsDir)
    .filter((n) => n.startsWith(prefix) && (!contains || n.includes(contains)) && n.toLowerCase().endsWith('.md'))
    .map((n) => {
      const full = path.join(docsDir, n);
      const st = fs.statSync(full);
      return { name: n, full, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function pickLatestOrExplicit(explicitPath, prefix, contains) {
  if (explicitPath) {
    const full = path.resolve(repoRoot, explicitPath);
    if (!fs.existsSync(full)) throw new Error(`File not found: ${explicitPath}`);
    return full;
  }
  return listDocsMatching(prefix, contains)[0]?.full || null;
}

function splitMdRow(line) {
  // | a | b | c |
  const raw = line.trim();
  if (!raw.startsWith('|')) return null;
  const parts = raw
    .split('|')
    .slice(1, -1)
    .map((p) => p.trim());
  return parts;
}

function isSeparatorRow(parts) {
  return parts.every((p) => /^-+$/.test(p.replace(/\s/g, '')));
}

function parseTable(lines, startIndex) {
  // expects header row at startIndex and separator at startIndex+1
  const header = splitMdRow(lines[startIndex]);
  const sep = splitMdRow(lines[startIndex + 1] || '');
  if (!header || !sep || header.length === 0 || sep.length !== header.length || !isSeparatorRow(sep)) {
    return null;
  }

  const rows = [];
  let i = startIndex + 2;
  for (; i < lines.length; i += 1) {
    const ln = lines[i];
    if (!ln.trim()) break;
    if (!ln.trim().startsWith('|')) break;
    const parts = splitMdRow(ln);
    if (!parts) break;
    if (parts.length !== header.length) break;
    rows.push(parts);
  }

  return { header, rows, endIndex: i };
}

function parseStaysDoc(mdText) {
  const lines = mdText.split(/\r?\n/);
  const domains = ['reservations', 'listings', 'clients', 'finance'];
  const out = new Map(); // domain -> Map(path -> example)
  for (const d of domains) out.set(d, new Map());

  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i].trim();
    const m = ln.match(/^###\s+(\w+)\s*$/);
    if (!m) continue;
    const domain = m[1];
    if (!out.has(domain)) continue;

    // find first table after this header
    for (let j = i + 1; j < Math.min(i + 60, lines.length); j += 1) {
      if (!lines[j].trim().startsWith('|')) continue;
      const table = parseTable(lines, j);
      if (!table) continue;
      const idxPath = table.header.findIndex((h) => h.toLowerCase() === 'path');
      const idxExample = table.header.findIndex((h) => h.toLowerCase().startsWith('exemplo'));
      if (idxPath === -1 || idxExample === -1) continue;

      const map = out.get(domain);
      for (const r of table.rows) {
        const p = r[idxPath];
        const ex = r[idxExample] ?? '';
        if (p) map.set(p, ex);
      }
      i = table.endIndex;
      break;
    }
  }

  return out;
}

function parseRendizyDoc(mdText) {
  const lines = mdText.split(/\r?\n/);
  const out = new Map(); // table -> Map(path -> {type, example})

  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i].trim();
    const m = ln.match(/^##\s+([a-zA-Z0-9_]+)\s*$/);
    if (!m) continue;
    const tableName = m[1];
    if (!out.has(tableName)) out.set(tableName, new Map());

    // find first table after this header
    for (let j = i + 1; j < Math.min(i + 120, lines.length); j += 1) {
      if (!lines[j].trim().startsWith('|')) continue;
      const table = parseTable(lines, j);
      if (!table) continue;

      const idxPath = table.header.findIndex((h) => h.toLowerCase() === 'path');
      const idxType = table.header.findIndex((h) => h.toLowerCase() === 'type');
      const idxExample = table.header.findIndex((h) => h.toLowerCase().startsWith('exemplo'));
      if (idxPath === -1 || idxType === -1 || idxExample === -1) continue;

      const map = out.get(tableName);
      for (const r of table.rows) {
        const p = r[idxPath];
        if (!p) continue;
        map.set(p, { type: r[idxType] ?? '', example: r[idxExample] ?? '' });
      }
      i = table.endIndex;
      break;
    }
  }

  return out;
}

function camelToTokens(s) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\./g, ' ')
    .replace(/\[\]/g, ' ')
    .replace(/_/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeStaysPath(p) {
  // reservations.guestsDetails.adults -> tokens; remove domain prefix
  const parts = String(p).split('.');
  if (parts.length <= 1) return camelToTokens(p);
  return camelToTokens(parts.slice(1).join('.'));
}

function normalizeRendizyPath(p) {
  // reservations.check_in -> tokens; remove table prefix
  const parts = String(p).split('.');
  if (parts.length <= 1) return camelToTokens(p);
  return camelToTokens(parts.slice(1).join('.'));
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function pickBestCandidate(staysPath, candidateRendizyPaths) {
  const spLower = String(staysPath).toLowerCase();

  // Manual overrides for high-signal fields.
  // Rationale: avoid matching Stays identifiers to Rendizy internal PKs.
  const overrides = {
    'reservations._id': ['reservations.external_id'],
    'reservations.id': ['reservations.external_id'],
    'reservations.partnercode': ['reservations.external_id'],
    'reservations.checkindate': ['reservations.check_in'],
    'reservations.checkoutdate': ['reservations.check_out'],
    'reservations.checkintime': ['reservations.check_in_time'],
    'reservations.checkouttime': ['reservations.check_out_time'],
    'reservations.guests': ['reservations.guests_total'],
    'reservations.guestsdetails.adults': ['reservations.guests_adults'],
    'reservations.guestsdetails.children': ['reservations.guests_children'],
    'reservations.guestsdetails.infants': ['reservations.guests_infants'],
    'reservations.price.currency': ['reservations.pricing_currency'],
    'reservations.price._f_total': ['reservations.pricing_total'],
    'reservations.price._f_expected': ['reservations.pricing_base_total'],
    'reservations.price.hostingdetails._f_nightprice': ['reservations.pricing_price_per_night'],
    'reservations.stats._f_totalpaid': ['reservations.pricing_total'],
    'reservations.creationdate': ['reservations.created_at'],
  };

  const direct = overrides[spLower];
  if (direct && direct.length) {
    for (const wanted of direct) {
      const found = candidateRendizyPaths.find((c) => String(c.path).toLowerCase() === wanted);
      if (found) return { ...found, score: 9 };
    }
  }

  const sTok = normalizeStaysPath(staysPath);
  let best = null;

  for (const cand of candidateRendizyPaths) {
    const rTok = normalizeRendizyPath(cand.path);
    let score = jaccard(sTok, rTok);

    // Small bonuses for common patterns.
    const sp = spLower;
    const rp = String(cand.path).toLowerCase();
    if (sp.includes('checkin') && rp.includes('check_in')) score += 0.25;
    if (sp.includes('checkout') && rp.includes('check_out')) score += 0.25;
    if (sp.endsWith('.id') && rp.endsWith('.external_id')) score += 0.15;
    if (sp.includes('guest') && rp.includes('guest')) score += 0.08;
    if (sp.includes('pricing') || sp.includes('price')) {
      if (rp.includes('pricing')) score += 0.08;
      if (rp.includes('payment')) score -= 0.05;
    }

    if (!best || score > best.score) best = { ...cand, score };
  }

  return best;
}

function suggestRendizyField(staysDomain, staysPath) {
  // Minimal suggestions for missing fields: prefer JSONB raw preservation.
  const sp = String(staysPath);
  if (staysDomain === 'reservations') {
    if (sp === 'reservations._id') return { suggested: 'reservations.external_id', rationale: 'usar como id externo (Stays _id) ou guardar em staysnet_raw' };
    if (sp === 'reservations.id') return { suggested: 'reservations.external_id', rationale: 'id curto pode ir em external_id (ou extra coluna external_code)' };
    if (sp === 'reservations.partnerCode') return { suggested: 'reservations.external_id', rationale: 'partnerCode pode ser external_id (ou coluna external_partner_code)' };
    if (sp.startsWith('reservations.guestsDetails')) return { suggested: 'reservations.staysnet_raw', rationale: 'guestsDetails.list contém dados variáveis; manter no JSONB raw' };
    if (sp.startsWith('reservations.price') || sp.startsWith('reservations.stats')) return { suggested: 'reservations.pricing_*', rationale: 'mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw' };
    return { suggested: 'reservations.staysnet_raw', rationale: 'padrão: preservar no JSONB raw' };
  }

  if (staysDomain === 'clients') return { suggested: 'guests.*', rationale: 'clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar)' };
  if (staysDomain === 'listings') return { suggested: 'properties.* / listings.*', rationale: 'listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo' };
  if (staysDomain === 'finance') return { suggested: 'financeiro_*', rationale: 'mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw' };

  return { suggested: '(review)', rationale: '' };
}

function buildCandidateRendizyPaths(rendizyMap, tables) {
  const out = [];
  for (const t of tables) {
    const m = rendizyMap.get(t);
    if (!m) continue;
    for (const [p, meta] of m.entries()) {
      out.push({ table: t, path: p, type: meta.type, example: meta.example });
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const staysDoc = pickLatestOrExplicit(args.staysDoc, 'STAYSNET_API_SCHEMA_CONSOLIDADO_', 'Json completo Stays');
  const rendizyDoc = pickLatestOrExplicit(args.rendizyDoc, 'RENDIZY_SCHEMA_CONSOLIDADO_', 'Json completo Rendizy');

  if (!staysDoc) throw new Error('Could not find Stays consolidated doc in docs/05-operations');
  if (!rendizyDoc) throw new Error('Could not find Rendizy consolidated doc in docs/05-operations');

  const staysText = fs.readFileSync(staysDoc, 'utf8');
  const rendizyText = fs.readFileSync(rendizyDoc, 'utf8');

  const stays = parseStaysDoc(staysText);
  const rendizy = parseRendizyDoc(rendizyText);

  const mappingTables = {
    reservations: ['reservations'],
    listings: ['properties', 'listings'],
    clients: ['guests'],
    finance: [
      'financeiro_lancamentos',
      'financeiro_titulos',
      'financeiro_linhas_extrato',
      'financeiro_regras_conciliacao',
    ],
  };

  const runId = runIdFromNow();
  fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, `STAYSNET_VS_RENDIZY_CONCILIACAO_${runId}.md`);

  const md = [];
  md.push(`# Stays vs Rendizy — conciliação de campos (com dados reais) — ${runId}`);
  md.push('');
  md.push('## Objetivo');
  md.push('- Colocar **campos Stays** e **campos Rendizy** lado a lado, com exemplos reais, para decidir o que vira coluna no Rendizy e o que precisa ser criado.');
  md.push('- Onde houver semelhança, o documento aproxima automaticamente (heurística).');
  md.push('');
  md.push('## Fontes');
  md.push(`- Stays: \`${path.relative(repoRoot, staysDoc).replace(/\\/g, '/')}\``);
  md.push(`- Rendizy: \`${path.relative(repoRoot, rendizyDoc).replace(/\\/g, '/')}\``);
  md.push('');
  md.push('## Legenda');
  md.push('- **EXISTS**: coluna existe no Rendizy (mesmo que sample esteja vazio).');
  md.push('- **MISSING**: não existe coluna equivalente nas tabelas candidatas.');
  md.push('- **REVIEW**: match fraco/ambíguo; decisão manual recomendada.');
  md.push('');

  for (const domain of ['reservations', 'listings', 'clients', 'finance']) {
    const staysMap = stays.get(domain) || new Map();
    const candidateTables = mappingTables[domain] || [];
    const candidates = buildCandidateRendizyPaths(rendizy, candidateTables);

    md.push(`## ${domain}`);
    md.push(`- Tabelas candidatas no Rendizy: ${candidateTables.map((t) => `\`${t}\``).join(', ') || '(nenhuma)'}`);
    md.push('');
    md.push('| stays.path | stays.exemplo | rendizy.candidato | rendizy.type | rendizy.exemplo | status | sugestão (se faltar) |');
    md.push('|---|---|---|---|---|---|---|');

    const staysPathsSorted = Array.from(staysMap.keys()).sort();
    for (const sp of staysPathsSorted) {
      // Skip container nodes to reduce noise.
      if (sp === domain) continue;
      if (sp.endsWith('[]')) continue;

      const best = pickBestCandidate(sp, candidates);
      const ex = staysMap.get(sp) ?? '';

      let status = 'MISSING';
      let candidatePath = '';
      let candidateType = '';
      let candidateExample = '';
      let suggestion = '';

      if (best && best.score >= 0.55) {
        status = 'EXISTS';
        candidatePath = best.path;
        candidateType = best.type;
        candidateExample = best.example;
      } else if (best && best.score >= 0.35) {
        status = 'REVIEW';
        candidatePath = best.path;
        candidateType = best.type;
        candidateExample = best.example;
      } else {
        const s = suggestRendizyField(domain, sp);
        suggestion = `${s.suggested} — ${s.rationale}`.trim();
      }

      md.push(
        `| ${mdEscape(sp)} | ${mdEscape(ex)} | ${mdEscape(candidatePath)} | ${mdEscape(candidateType)} | ${mdEscape(candidateExample)} | ${status} | ${mdEscape(suggestion)} |`
      );
    }

    md.push('');
  }

  fs.writeFileSync(outPath, md.join('\n'), 'utf8');
  console.log(`OK: wrote reconciliation doc to ${outPath}`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
