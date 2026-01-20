import fs from 'node:fs';
import path from 'node:path';

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // string, number, boolean, object
}

function previewValue(value) {
  const t = typeOf(value);
  if (t === 'string') {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
  }
  if (t === 'number' || t === 'boolean' || t === 'null') return String(value);
  if (t === 'array') return `[array len=${value.length}]`;
  if (t === 'object') {
    if (!value) return 'null';
    const keys = Object.keys(value);
    return `{object keys=${keys.length}${keys.length ? `: ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ', …' : ''}` : ''}}`;
  }
  return String(value);
}

function addSample(entry, value) {
  const p = previewValue(value);
  if (!entry.examples.includes(p) && entry.examples.length < 3) entry.examples.push(p);
}

function shouldCollectEnum(value) {
  const t = typeOf(value);
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'null';
}

function walk(value, currentPath, acc, options) {
  const t = typeOf(value);

  if (!acc.has(currentPath)) {
    acc.set(currentPath, {
      path: currentPath,
      types: new Set(),
      examples: [],
      distinct: new Set(),
      count: 0,
    });
  }

  const entry = acc.get(currentPath);
  entry.types.add(t);
  entry.count += 1;
  addSample(entry, value);

  if (shouldCollectEnum(value) && entry.distinct.size <= options.maxDistinct) {
    entry.distinct.add(String(value));
  }

  if (t === 'array') {
    const arr = value;
    const nextPath = currentPath ? `${currentPath}[]` : '[]';
    // Record array item shape under path[]
    for (let i = 0; i < Math.min(arr.length, options.maxArrayItems); i += 1) {
      walk(arr[i], nextPath, acc, options);
    }
    return;
  }

  if (t === 'object') {
    const obj = value;
    if (!obj) return;

    // Only traverse enumerable keys
    const keys = Object.keys(obj);
    for (const key of keys) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      walk(obj[key], childPath, acc, options);
    }
  }
}

function toMarkdown(rows, meta) {
  const lines = [];
  lines.push('# Stays schema observado (JSON)');
  lines.push('');
  lines.push('## Fonte');
  for (const f of meta.files) lines.push(`- ${f}`);
  lines.push('');
  lines.push(`Total de paths observados: ${rows.length}`);
  lines.push('');

  // Candidate enums
  const enumCandidates = rows
    .filter((r) => r.distinctCount > 1 && r.distinctCount <= 12)
    .sort((a, b) => a.distinctCount - b.distinctCount || a.path.localeCompare(b.path))
    .slice(0, 120);

  if (enumCandidates.length) {
    lines.push('## Campos com cara de enum');
    for (const r of enumCandidates) {
      lines.push(`- ${r.path}: ${r.distinctPreview}`);
    }
    lines.push('');
  }

  lines.push('## Campos (paths)');
  lines.push('| path | tipos | exemplos |');
  lines.push('|---|---|---|');
  for (const r of rows) {
    const examples = r.examples.length ? r.examples.join(' / ') : '';
    lines.push(`| ${r.path || '(root)'} | ${r.types.join(', ')} | ${examples.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');

  lines.push('## Observações para o Rendizy');
  lines.push('- Trate a Stays como fonte de verdade: mantenha uma coluna JSONB `staysnet_raw` (ou equivalente) com o payload bruto por entidade, para evoluir o modelo sem perder informação.');
  lines.push('- Modele campos “derivados” (ex.: address normalizado, lat/lng, status) como projeções do raw, mas evite descartar campos que hoje não usamos.');
  lines.push('- Para reservas: precisamos do payload raw de reservations (não só debug de chaves) para fechar enums reais de `type`/`status` e o mapeamento para o nosso domínio.');

  return lines.join('\n');
}

function normalizeArgPath(p) {
  if (!p) return p;
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node generate-stays-schema-md.mjs <file1.json> [file2.json ...]');
    process.exit(2);
  }

  const options = {
    maxArrayItems: 50,
    maxDistinct: 50,
  };

  const acc = new Map();
  const files = [];

  for (const rawArg of args) {
    const filePath = normalizeArgPath(rawArg);
    files.push(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    walk(json, '', acc, options);
  }

  const rows = Array.from(acc.values())
    .map((e) => {
      const distinct = Array.from(e.distinct);
      distinct.sort();
      const distinctCount = distinct.length;
      const distinctPreview = distinctCount <= 12 ? distinct.join(', ') : `${distinct.slice(0, 12).join(', ')}, …`;
      return {
        path: e.path,
        types: Array.from(e.types).sort(),
        examples: e.examples,
        distinctCount,
        distinctPreview,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const md = toMarkdown(rows, { files });
  const outFile = path.resolve(process.cwd(), '_stays_schema_observado.md');
  fs.writeFileSync(outFile, md, 'utf8');
  console.log(`Wrote ${outFile}`);
}

main();
