require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const ANUNCIO_ID = '9f6cad48-42e9-4ed5-b766-82127a62dce2'
const FIELD = 'title'
const VALUE = 'Teste Auth Frontend Modificado'
const ORG_ID = '00000000-0000-0000-0000-000000000000'
const USER_ID = '00000000-0000-0000-0000-000000000002'

// Testar RPC diretamente via REST
async function testRpcDirectly() {
  console.log('\n=== TESTANDO RPC DIRETO VIA REST ===')
  
  const payload = {
    p_anuncio_id: ANUNCIO_ID,
    p_field: FIELD,
    p_value: VALUE,
    p_idempotency_key: `test-${Date.now()}`,
    p_organization_id: ORG_ID,
    p_user_id: USER_ID
  }
  
  console.log('Payload:', JSON.stringify(payload, null, 2))
  
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/save_anuncio_field`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    })
    
    const text = await res.text()
    console.log(`Status: ${res.status}`)
    console.log(`Response: ${text}`)
    
    if (res.status >= 400) {
      console.log('\n❌ RPC falhou!')
      try {
        const json = JSON.parse(text)
        console.log('Erro detalhado:', JSON.stringify(json, null, 2))
      } catch (e) {}
    } else {
      console.log('\n✅ RPC sucesso!')
    }
  } catch (err) {
    console.error('❌ Erro ao chamar RPC:', err.message)
  }
}

// Testar via edge function
async function testViaEdgeFunction() {
  console.log('\n\n=== TESTANDO VIA EDGE FUNCTION ===')
  
  const payload = {
    anuncio_id: ANUNCIO_ID,
    field: FIELD,
    value: VALUE,
    idempotency_key: `test-${Date.now()}`,
    organization_id: ORG_ID,
    user_id: USER_ID
  }
  
  console.log('Payload:', JSON.stringify(payload, null, 2))
  
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/anuncio-ultimate/save-field`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(payload)
    })
    
    const text = await res.text()
    console.log(`Status: ${res.status}`)
    console.log(`Response: ${text}`)
    
    if (res.status >= 400) {
      console.log('\n❌ Edge function falhou!')
    } else {
      console.log('\n✅ Edge function sucesso!')
    }
  } catch (err) {
    console.error('❌ Erro ao chamar edge function:', err.message)
  }
}

async function run() {
  await testRpcDirectly()
  await testViaEdgeFunction()
}

run()
