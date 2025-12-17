const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE'

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_anuncio_field`, {
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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/anuncio-ultimate/save-field`, {
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
