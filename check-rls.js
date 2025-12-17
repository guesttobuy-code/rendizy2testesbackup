import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';

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
