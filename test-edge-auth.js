// Teste de autenticação com ANON_KEY na edge function

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';

async function testEdgeFunctionAuth() {
  console.log('\n🧪 TESTE DE AUTENTICAÇÃO NA EDGE FUNCTION\n');
  
  const res = await fetch(`${SUPABASE_URL}/functions/v1/anuncio-ultimate/save-field`, {
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
