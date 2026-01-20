// Teste de autenticação com ANON_KEY na edge function

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_ANON_KEY em .env.local');
  process.exit(1);
}

async function testEdgeFunctionAuth() {
  console.log('\n🧪 TESTE DE AUTENTICAÇÃO NA EDGE FUNCTION\n');
  
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/anuncio-ultimate/save-field`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      anuncio_id: null,
      field: 'title',
      value: 'Teste Auth Frontend',
      idempotency_key: `test-frontend-${Date.now()}`,
      organization_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000002'
    })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
  
  if (res.status === 200) {
    console.log('\n✅ Edge function aceitou ANON_KEY!');
  } else {
    console.log('\n❌ Edge function rejeitou ANON_KEY');
  }
}

testEdgeFunctionAuth().catch(console.error);
