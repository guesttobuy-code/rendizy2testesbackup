import fs from 'node:fs';
import path from 'node:path';

const fileArg = process.argv[2] || 'tmp_staysnet_reservations_debug.json';
const filePath = path.resolve(process.cwd(), fileArg);

const j = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const sample = Array.isArray(j.debugSample) ? j.debugSample : [];

const typeCounts = {};
const statusCounts = {};
const statsKeysCounts = {};

const examples = [];

for (const s of sample) {
  const t = s.type ?? s?.stats?.type ?? null;
  const st = s.status ?? s?.stats?.status ?? null;

  if (t) typeCounts[String(t)] = (typeCounts[String(t)] || 0) + 1;
  if (st) statusCounts[String(st)] = (statusCounts[String(st)] || 0) + 1;

  if (s?.stats && typeof s.stats === 'object') {
    for (const k of Object.keys(s.stats)) {
      statsKeysCounts[k] = (statsKeysCounts[k] || 0) + 1;
    }
  }

  if (examples.length < 10) {
    examples.push({
      confirmationCode: s.confirmationCode,
      type: t,
      status: st,
      stats: s.stats,
      keys: (s.keys || []).slice(0, 25),
    });
  }
}

const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

console.log('FILE', filePath);
console.log('debugSample length', sample.length);
console.log('TYPE counts', top(typeCounts).slice(0, 30));
console.log('STATUS counts', top(statusCounts).slice(0, 30));
console.log('stats keys', top(statsKeysCounts).slice(0, 30));
console.log('EXAMPLES', examples);
