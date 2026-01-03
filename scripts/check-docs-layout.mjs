import fs from 'node:fs';
import path from 'node:path';

function readWhitelist(repoRoot) {
  const whitelistPath = path.join(repoRoot, 'docs', '03-conventions', 'ROOT_MD_WHITELIST.txt');
  if (!fs.existsSync(whitelistPath)) return new Set();

  const lines = fs.readFileSync(whitelistPath, 'utf8').split(/\r?\n/);
  const set = new Set();

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue;
    set.add(t.toLowerCase());
  }

  return set;
}

function listRootMarkdown(repoRoot) {
  const entries = fs.readdirSync(repoRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));
}

const repoRoot = process.cwd();
const whitelist = readWhitelist(repoRoot);
const rootMds = listRootMarkdown(repoRoot);

const notAllowed = rootMds.filter((name) => !whitelist.has(name.toLowerCase()));

if (notAllowed.length > 0) {
  console.error('Docs governance violation: root-level .md files not in whitelist:');
  for (const f of notAllowed) console.error(`- ${f}`);
  console.error('Move them into docs/ (or docs/08-archive/), or add to docs/03-conventions/ROOT_MD_WHITELIST.txt.');
  process.exit(1);
}

console.log(`docs check ok: root .md files=${rootMds.length}, whitelist=${whitelist.size}`);
