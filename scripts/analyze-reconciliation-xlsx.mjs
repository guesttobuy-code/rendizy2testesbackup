import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';

function norm(value) {
  return String(value ?? '').toLowerCase();
}

function entityFromSource(source) {
  const s = norm(source);
  if (s.includes('supabase: reservations') || s.includes('stays: /booking/reservations') || s.includes('/booking/reservations')) return 'reservation';
  if (s.includes('supabase: guests') || s.includes('guests')) return 'guest';
  if (s.includes('stays: /content/properties') || s.includes('/content/properties') || s.includes('anuncios')) return 'property';
  return 'unknown';
}

function asList(obj) {
  return Object.entries(obj).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function pick(r) {
  return {
    rendizy_field: r.rendizy_field,
    rendizy_label: r.rendizy_label,
    rendizy_source: r.rendizy_source,
    rendizy_context: r.rendizy_context,
    platform_field: r.platform_field,
    platform_label: r.platform_label,
    platform_source: r.platform_source,
    platform_context: r.platform_context,
    similarity_score: r.similarity_score,
    confidence: r.confidence,
  };
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const inputArg = process.argv[2];
const defaultPath = path.resolve(process.cwd(), '..', 'planilhas auditoria', 'data-reconciliation-report_2025-11-26_to_2025-12-26_2025-12-26T02-01-19-586Z.xlsx');
const inputPath = path.resolve(process.cwd(), inputArg || defaultPath);

if (!fs.existsSync(inputPath)) {
  console.error('XLSX not found:', inputPath);
  process.exit(1);
}

const wb = XLSX.readFile(inputPath);
const sheetName = wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

const flowCounts = {};
const mismatch = [];
const statusRows = [];
const ambiguousFieldRows = [];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const re = entityFromSource(r.rendizy_source);
  const pe = entityFromSource(r.platform_source);
  const flowKey = `${re} -> ${pe}`;
  flowCounts[flowKey] = (flowCounts[flowKey] || 0) + 1;

  const rowNumber = i + 2; // + header row

  if (re !== 'unknown' && pe !== 'unknown' && re !== pe) {
    mismatch.push({ rowNumber, re, pe, ...pick(r) });
  }

  if (norm(r.rendizy_field) === 'status') {
    statusRows.push({ rowNumber, re, pe, ...pick(r) });
  }

  const f = norm(r.rendizy_field);
  if (['id', 'status', 'name', 'title', 'code'].includes(f)) {
    ambiguousFieldRows.push({ rowNumber, re, pe, ...pick(r) });
  }
}

mismatch.sort((a, b) => toNum(b.similarity_score) - toNum(a.similarity_score));
statusRows.sort((a, b) => toNum(b.similarity_score) - toNum(a.similarity_score));

const outDir = path.dirname(inputPath);
const outPath = path.join(
  outDir,
  `ANALISE_${path.basename(inputPath, path.extname(inputPath))}.md`
);

const lines = [];
lines.push(`# Análise manual — Data Reconciliation Export`);
lines.push('');
lines.push(`- Arquivo: ${inputPath}`);
lines.push(`- Aba: ${sheetName}`);
lines.push(`- Linhas (sem header): ${rows.length}`);
lines.push('');

lines.push('## Diagnóstico (por que ficou “muito errado”)');
lines.push('');
lines.push('O arquivo exportado traz **1 sugestão única por campo Rendizy** (a melhor por score textual). Como o score atual é baseado principalmente em nome/label (Levenshtein + keywords), ele cai em armadilhas previsíveis:');
lines.push('');
lines.push('- Campos genéricos como `status`, `id`, `name` existem em várias entidades (reserva, propriedade, hóspede).');
lines.push('- Quando existe `status` em propriedades e `status` em reservas, o algoritmo tende a dar **100/100** só porque o texto bate, mesmo sendo entidade errada.');
lines.push('- Portanto, **o score alto não significa “campo certo”**; significa “texto parecido”.');
lines.push('');

lines.push('## Fluxos (heurística por fonte)');
lines.push('');
lines.push('Classifiquei as entidades por `*_source` (heurística simples: reservations→reserva, properties/anuncios→propriedade, guests→hóspede).');
lines.push('');
lines.push('| Fluxo (Rendizy -> Plataforma) | Qtde |');
lines.push('|---|---:|');
for (const [k, v] of asList(flowCounts)) {
  lines.push(`| ${mdEscape(k)} | ${v} |`);
}
lines.push('');

lines.push('## Exemplos claros do erro (status)');
lines.push('');
lines.push('Abaixo alguns registros onde `rendizy_field = status` aponta para `platform_field = status` mas em fonte de **propriedade**:');
lines.push('');
lines.push('| Linha | Rendizy source | Platform source | Score | Rendizy field | Platform field |');
lines.push('|---:|---|---|---:|---|---|');
for (const r of statusRows.slice(0, 15)) {
  lines.push(
    `| ${r.rowNumber} | ${mdEscape(r.rendizy_source)} | ${mdEscape(r.platform_source)} | ${toNum(r.similarity_score)} | ${mdEscape(r.rendizy_field)} | ${mdEscape(r.platform_field)} |`
  );
}
lines.push('');

lines.push('## Mismatches por entidade (top 20 por score)');
lines.push('');
lines.push('| Linha | Rendizy entity | Platform entity | Score | Rendizy source | Platform source | Rendizy field | Platform field |');
lines.push('|---:|---|---|---:|---|---|---|---|');
for (const r of mismatch.slice(0, 20)) {
  lines.push(
    `| ${r.rowNumber} | ${r.re} | ${r.pe} | ${toNum(r.similarity_score)} | ${mdEscape(r.rendizy_source)} | ${mdEscape(r.platform_source)} | ${mdEscape(r.rendizy_field)} | ${mdEscape(r.platform_field)} |`
  );
}
lines.push('');

lines.push('## Recomendação prática (sem mexer no algoritmo agora)');
lines.push('');
lines.push('Pra “cruzar o dado da forma certa” rápido, a regra de ouro é:');
lines.push('');
lines.push('- Se `rendizy_source` for **Supabase: reservations**, a sugestão válida precisa vir de **Stays: /booking/reservations** (reserva).');
lines.push('- Se `rendizy_source` for **anuncios_***, a sugestão válida tende a ser **Stays: /content/properties** (propriedade).');
lines.push('- Se aparecerem campos genéricos (`status`, `id`, `name`), trate como **“ambíguo”** e decida por entidade, não por texto.');
lines.push('');
lines.push('### Casos a revisar primeiro (alto risco)');
lines.push('');
lines.push('Qualquer linha onde o par entidade→entidade estiver cruzado deve ser revisada manualmente. Comece por estes nomes (são os que mais enganam):');
lines.push('');
lines.push('- `status` (reserva ≠ propriedade)');
lines.push('- `id` (id de reserva ≠ id de imóvel)');
lines.push('- `name/title` (nome do hóspede ≠ nome do imóvel)');
lines.push('');

lines.push('## Próximo passo (você + eu aqui no arquivo)');
lines.push('');
lines.push('Me diga qual é o comportamento correto esperado para `Supabase: reservations.status` no seu sistema (ex.: confirmed/cancelled/checked_in/checked_out).');
lines.push('Aí eu ajusto o `.md` já com um “de/para” final sugerido e você só valida.');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('WROTE', outPath);
