import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }).trim();
}

let branch;
try {
  branch = run('git rev-parse --abbrev-ref HEAD');
} catch (err) {
  const stderr = err?.stderr?.toString?.() ?? '';
  console.error('[check-on-main] Não consegui ler o branch atual via git.');
  if (stderr) console.error(stderr.trim());
  process.exit(1);
}

if (branch !== 'main') {
  console.error(`[check-on-main] Branch atual: '${branch}'. Este projeto exige SOMENTE 'main'.`);
  console.error("[check-on-main] Rode: git checkout main && git pull");
  process.exit(1);
}
