import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function readEnvLocal(projectRoot) {
  const p = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(p)) return {};
  const out = {};
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || /^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2] ?? '';
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in out)) out[key] = value;
  }
  return out;
}

const envLocal = readEnvLocal(process.cwd());
const SUPABASE_URL = process.env.SUPABASE_URL || envLocal.VITE_SUPABASE_URL || envLocal.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY || envLocal.SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || envLocal.VITE_SUPABASE_ANON_KEY || envLocal.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL ausente (.env.local ou env).');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY ausente (.env.local ou env).');
  process.exit(1);
}
if (!ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY ausente (.env.local ou env).');
  process.exit(1);
}

console.log('🔍 VERIFICANDO RLS E PERMISSÕES\n');

const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

// RLS policies não são acessíveis via REST API diretamente
console.log('1️⃣ Pulando verificação de RLS (não acessível via REST)...');

// Testar acesso com SERVICE_ROLE
console.log('\n3️⃣ Testando acesso com SERVICE_ROLE_KEY...');
const { data: dataService, error: errorService } = await supabaseService
  .from('anuncios_ultimate')
  .select('*')
  .limit(5);

if (errorService) {
  console.error('❌ Erro com SERVICE_ROLE:', errorService);
} else {
  console.log(`✅ SERVICE_ROLE conseguiu ler ${dataService.length} anúncios`);
}

// Testar acesso com ANON
console.log('\n4️⃣ Testando acesso com ANON_KEY...');
const { data: dataAnon, error: errorAnon } = await supabaseAnon
  .from('anuncios_ultimate')
  .select('*')
  .limit(5);

if (errorAnon) {
  console.error('❌ Erro com ANON_KEY:', errorAnon.message);
  console.log('Detalhes:', errorAnon);
} else {
  console.log(`✅ ANON_KEY conseguiu ler ${dataAnon.length} anúncios`);
}

console.log('\n✅ DIAGNÓSTICO COMPLETO');
