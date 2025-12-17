#!/usr/bin/env node
// scripts/check-duplicate-filenames.js
// Detecta arquivos .ts/.tsx com mesmo basename em diferentes caminhos
// Ignora a pasta offline_archives
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (p.includes('offline_archives') || p.includes('node_modules') || p.includes('.git')) continue;
      walk(p, out);
    } else if (e.isFile()) {
      if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  }
  return out;
}

function main() {
  const root = process.cwd();
  const files = walk(root);
  const map = new Map();
  for (const f of files) {
    const b = path.basename(f);
    if (!map.has(b)) map.set(b, []);
    map.get(b).push(f);
  }

  const duplicates = [];
  for (const [name, paths] of map.entries()) {
    if (paths.length > 1) duplicates.push({ name, paths });
  }

  if (duplicates.length) {
    console.error('\n🚨 Erro: arquivos .ts/.tsx com mesmo nome base detectados (possíveis duplicatas):\n');
    for (const d of duplicates) {
      console.error(`- ${d.name}`);
      for (const p of d.paths) console.error(`    ${p}`);
      console.error('');
    }
    console.error('Sugestão: mova as cópias não ativas para ./offline_archives/ ou renomeie.');
    process.exitCode = 2;
    return;
  }

  console.log('✅ Nenhuma duplicata de .ts/.tsx encontrada.');
}

main();
