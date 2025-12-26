import fs from 'node:fs';
import path from 'node:path';

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function safeString(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function uniq(arr) {
  return Array.from(new Set(arr.filter((x) => x !== undefined && x !== null)));
}

function countBy(arr) {
  const m = new Map();
  for (const v of arr) {
    const key = v === null ? 'null' : String(v);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function pick(obj, keys) {
  if (!isObject(obj)) return {};
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
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

function mdEscape(s) {
  return String(s).replace(/\|/g, '\\|');
}

function main() {
  const args = process.argv.slice(2);
  const inFile = args[0] || path.resolve(process.cwd(), '../json-raw-banco-reservations-20251226-000830/reservations_with_staysnet_raw.json');
  const absIn = path.isAbsolute(inFile) ? inFile : path.resolve(process.cwd(), inFile);

  const raw = fs.readFileSync(absIn, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Esperava um array no arquivo de entrada.');

  const rows = data;
  const total = rows.length;

  const stays = rows.map((r) => r?.staysnet_raw).filter(Boolean);

  const staysType = stays.map((r) => r?.type);
  const staysIdListing = stays.map((r) => r?._idlisting);
  const staysPartnerName = stays.map((r) => r?.partner?.name);
  const staysPartnerCode = stays.map((r) => r?.partnerCode);
  const staysCheckInTime = stays.map((r) => r?.checkInTime);
  const staysCheckOutTime = stays.map((r) => r?.checkOutTime);
  const staysGuests = stays.map((r) => r?.guests);
  const staysGuestsAdults = stays.map((r) => r?.guestsDetails?.adults);
  const staysGuestsChildren = stays.map((r) => r?.guestsDetails?.children);
  const staysGuestsInfants = stays.map((r) => r?.guestsDetails?.infants);

  const priceTotal = stays.map((r) => r?.price?._f_total);
  const priceExpected = stays.map((r) => r?.price?._f_expected);
  const priceCurrency = stays.map((r) => r?.price?.currency);

  const statsKeys = uniq(
    stays
      .map((r) => r?.stats)
      .filter(Boolean)
      .flatMap((s) => (isObject(s) ? Object.keys(s) : []))
  ).sort();

  const rawPaths = new Set();
  for (const r of stays.slice(0, 10)) {
    flattenPaths(r, '', rawPaths, { maxArrayItems: 20 });
  }

  const lines = [];
  lines.push('# Modelo de Reservation (Stays) — observado');
  lines.push('');
  lines.push('## Fonte');
  lines.push(`- ${absIn}`);
  lines.push(`- Total de registros analisados: ${total}`);
  lines.push('');

  lines.push('## Campos-chave (o que existe de verdade no raw)');
  lines.push('- Identidade: `staysnet_raw._id` (id único), `staysnet_raw.id` (código curto tipo RF21I), e também existe `partnerCode` (parece um código do canal)');
  lines.push('- Relacionamento com anúncio: `staysnet_raw._idlisting` (id do listing na Stays)');
  lines.push('- Datas/horas: `checkInDate`, `checkOutDate`, `checkInTime`, `checkOutTime`, `creationDate`');
  lines.push('- Tipo (semântica macro): `staysnet_raw.type`');
  lines.push('- Canal/parceiro: `staysnet_raw.partner.name` e `staysnet_raw.partner._id`');
  lines.push('- Pessoas: `staysnet_raw.guests` + `staysnet_raw.guestsDetails.{adults,children,infants}`');
  lines.push('- Preço: `staysnet_raw.price` (total, expected, currency, extrasDetails, hostingDetails)');
  lines.push('- Metadados: `stats`, `internalNote`, `cancelMessage` (quando cancelada)');
  lines.push('');

  lines.push('## Valores observados (amostra)');
  lines.push('');
  lines.push('### staysnet_raw.type');
  for (const [k, c] of countBy(staysType)) lines.push(`- ${k}: ${c}`);
  lines.push('');

  lines.push('### partner.name');
  for (const [k, c] of countBy(staysPartnerName)) lines.push(`- ${k}: ${c}`);
  lines.push('');

  lines.push('### checkInTime / checkOutTime');
  lines.push(`- checkInTime: ${uniq(staysCheckInTime).sort().join(', ') || '(vazio)'}`);
  lines.push(`- checkOutTime: ${uniq(staysCheckOutTime).sort().join(', ') || '(vazio)'}`);
  lines.push('');

  lines.push('### guests / guestsDetails');
  lines.push(`- guests (total): ${uniq(staysGuests).sort((a,b)=>a-b).join(', ') || '(vazio)'}`);
  lines.push(`- adults: ${uniq(staysGuestsAdults).sort((a,b)=>a-b).join(', ') || '(vazio)'}`);
  lines.push(`- children: ${uniq(staysGuestsChildren).sort((a,b)=>a-b).join(', ') || '(vazio)'}`);
  lines.push(`- infants: ${uniq(staysGuestsInfants).sort((a,b)=>a-b).join(', ') || '(vazio)'}`);
  lines.push('');

  lines.push('### price');
  lines.push(`- currency: ${uniq(priceCurrency).sort().join(', ') || '(vazio)'}`);
  lines.push(`- _f_total: min=${Math.min(...priceTotal.filter((n)=>typeof n==='number'))} max=${Math.max(...priceTotal.filter((n)=>typeof n==='number'))}`);
  if (priceExpected.some((n) => typeof n === 'number')) {
    lines.push(`- _f_expected: min=${Math.min(...priceExpected.filter((n)=>typeof n==='number'))} max=${Math.max(...priceExpected.filter((n)=>typeof n==='number'))}`);
  }
  lines.push('');

  lines.push('### stats (chaves observadas)');
  lines.push(statsKeys.length ? `- ${statsKeys.join(', ')}` : '- (nenhuma chave encontrada)');
  lines.push('');

  lines.push('## Paths observados (top 10 reservas, para referência rápida)');
  lines.push('| path |');
  lines.push('|---|');
  for (const p of Array.from(rawPaths).sort()) lines.push(`| ${mdEscape(p)} |`);
  lines.push('');

  lines.push('## Proposta de alinhamento (Rendizy → espelhar Stays)');
  lines.push('1) **Fonte de verdade sempre preservada**: garantir `reservations.staysnet_raw` (JSONB) preenchido para *todas* as reservas importadas.');
  lines.push('2) **Separar semânticas**:');
  lines.push('   - `staysnet_raw.type` = “natureza macro” do evento (no sample: `booked` vs `canceled`).');
  lines.push('   - `reservations.status` (Rendizy) = nosso status operacional (hoje: pending/confirmed/checked_in/checked_out/cancelled/no_show).');
  lines.push('   - Recomendo adicionar colunas derivadas: `staysnet_type` (TEXT), `staysnet_partner_name` (TEXT), `staysnet_listing_id` (TEXT), `staysnet_id` (TEXT), `staysnet_partner_code` (TEXT).');
  lines.push('3) **Mapeamento sugerido (mínimo, baseado no observado)**:');
  lines.push('   - `staysnet_raw.type=booked` → `reservations.status=confirmed`');
  lines.push('   - `staysnet_raw.type=canceled` → `reservations.status=cancelled` + `cancelled_at` se existir no raw');
  lines.push('4) **Canal/plataforma**: derive `reservations.platform` a partir de `partner.name` (ex.: contém "airbnb" → airbnb; contém "booking" → booking; senão direct/other).');
  lines.push('5) **Queries e performance**: manter JSONB para tudo, mas indexar colunas derivadas mais usadas (`staysnet_listing_id`, `check_in`, `check_out`, `platform`, `status`).');
  lines.push('');

  lines.push('## O que ainda falta para fechar 100% (sem achismo)');
  lines.push('- No sample, `staysnet_raw.status` não apareceu. Próximo passo: aumentar amostra (ex.: 500) ou extrair direto do endpoint de reservations da Stays e rodar este mesmo relatório; aí fechamos o enum real de `status` e ajustamos o domínio do Rendizy com segurança.');

  const outFile = path.resolve(process.cwd(), '_stays_reservations_model.md');
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`Wrote ${outFile}`);
}

main();
