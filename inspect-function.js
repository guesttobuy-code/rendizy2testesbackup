require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

async function inspectFunction() {
  console.log('🔍 Inspecionando função save_anuncio_field...\n')
  
  try {
    // Query pg_proc para ver o corpo da função
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/get_function_source`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_func_name: 'save_anuncio_field'
      })
    })
    
    const text = await res.text()
    console.log(`Status: ${res.status}`)
    console.log(`Response: ${text}`)
  } catch (err) {
    console.error('❌ Erro:', err.message)
    
    // Tentar query direto ao pg_proc
    console.log('\n🔍 Tentando query ao pg_proc...\n')
    
    try {
      const res2 = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/pg_proc?proname=eq.save_anuncio_field&select=prosrc`, {
        method: 'GET',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      })
      
      const text2 = await res2.text()
      console.log(`Status: ${res2.status}`)
      console.log(`Response (primeiros 500 chars): ${text2.substring(0, 500)}`)
    } catch (err2) {
      console.error('❌ Erro na query:', err2.message)
    }
  }
}

inspectFunction()
