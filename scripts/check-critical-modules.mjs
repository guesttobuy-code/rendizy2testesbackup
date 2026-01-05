#!/usr/bin/env node
/**
 * 🛡️ Critical Modules Guard (Anúncios Ultimate / Reservas / Calendário)
 *
 * Goal:
 * - Prevent accidental regressions in the platform tripod.
 * - This is a STATIC guard: it validates that key routes/invariants/sentinels
 *   still exist in the codebase (fast, offline, deterministic).
 *
 * Usage:
 *   node scripts/check-critical-modules.mjs
 *
 * Exit codes:
 *   0 = OK
 *   1 = Something critical is missing
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const readText = (relFile) => {
  const abs = path.join(projectRoot, relFile);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `file_not_found:${relFile}`, abs };
  }
  return { ok: true, abs, text: fs.readFileSync(abs, 'utf8') };
};

const mustInclude = (content, needle) => {
  return content.includes(needle);
};

const checks = [
  {
    name: 'Anúncios Ultimate: routes-anuncios.ts invariants',
    file: 'supabase/functions/rendizy-server/routes-anuncios.ts',
    needles: [
      'app.post("/save-field"',
      'supabase.rpc("save_anuncio_field"',
      // Defensive invariants we rely on to avoid data loss
      'IMPORTANT: never overwrite anuncios_ultimate.data',
      'deepMerge',
      // Audit/idempotency (defensive fallback)
      "from('anuncios_field_changes')",
    ],
  },
  {
    name: 'Reservas: contract lock present',
    file: 'supabase/functions/rendizy-server/routes-reservations.ts',
    needles: [
      '🔒 CADEADO DE CONTRATO - RESERVATIONS ROUTES',
      'export async function listReservations',
      "from('reservations')",
      'Filtering reservations by organization_id',
    ],
  },
  {
    name: 'Calendário: key SQL exports exist',
    file: 'supabase/functions/rendizy-server/routes-calendar.ts',
    needles: [
      'export async function getCalendarDataSql',
      'export async function getCalendarStatsSql',
      'export async function createCalendarBlockSql',
      'export async function deleteCalendarBlockSql',
      "from('reservations')",
      "from('blocks')",
    ],
  },
  {
    name: 'Server index: calendar routes mounted',
    file: 'supabase/functions/rendizy-server/index.ts',
    needles: [
      'app.get("/calendar", tenancyMiddleware, calendarRoutes.getCalendarDataSql)',
      'app.get("/calendar/stats", tenancyMiddleware, calendarRoutes.getCalendarStatsSql)',
      'app.get("/calendar/blocks", tenancyMiddleware, calendarRoutes.getCalendarBlocksSql)',
      'app.post("/calendar/blocks", tenancyMiddleware, calendarRoutes.createCalendarBlockSql)',
      'app.delete("/calendar/blocks/:id", tenancyMiddleware, calendarRoutes.deleteCalendarBlockSql)',
    ],
  },
];

console.log(`${CYAN}🛡️  CHECK: Critical modules guard${RESET}`);

let hasErrors = false;
const missing = [];

for (const c of checks) {
  const res = readText(c.file);
  if (!res.ok) {
    console.error(`${RED}❌ ${c.name}${RESET}`);
    console.error(`${RED}   Missing file: ${c.file}${RESET}`);
    hasErrors = true;
    missing.push(`${c.file} (file missing)`);
    continue;
  }

  const absent = [];
  for (const needle of c.needles) {
    if (!mustInclude(res.text, needle)) absent.push(needle);
  }

  if (absent.length > 0) {
    console.error(`${RED}❌ ${c.name}${RESET}`);
    console.error(`${YELLOW}   Missing sentinel(s):${RESET}`);
    for (const n of absent) {
      console.error(`${YELLOW}     - ${n}${RESET}`);
      missing.push(`${c.file}: ${n}`);
    }
    hasErrors = true;
  } else {
    console.log(`${GREEN}✅ ${c.name}${RESET}`);
  }
}

console.log('');

if (hasErrors) {
  console.error(`${RED}🛑 BLOCKED: critical module guard failed.${RESET}`);
  console.error(`${YELLOW}Do NOT deploy before fixing the missing items.${RESET}`);
  console.error('');
  console.error('Missing:');
  for (const m of missing) console.error(`  - ${m}`);
  console.error('');
  console.error(`${CYAN}Tip:${RESET} if you intentionally changed the contract, create v2 endpoints and update the guard + docs.`);
  process.exit(1);
}

console.log(`${GREEN}✅ OK: tripod modules look protected (static guard).${RESET}`);
process.exit(0);
