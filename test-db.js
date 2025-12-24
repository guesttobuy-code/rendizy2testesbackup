// Script de teste para verificar se as tabelas e RPC existem

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

async function checkTables() {
  console.log('\n🔍 Verificando tabela anuncios_ultimate...');
  
  const res1 = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/anuncios_ultimate?limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  console.log('Status:', res1.status);
  if (res1.status === 200) {
    console.log('✅ Tabela anuncios_ultimate existe!');
  } else {
    console.log('❌ Tabela anuncios_ultimate não existe. Body:', await res1.text());
  }

  console.log('\n🔍 Verificando tabela anuncios_field_changes...');
  
  const res2 = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/anuncios_field_changes?limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  console.log('Status:', res2.status);
  if (res2.status === 200) {
    console.log('✅ Tabela anuncios_field_changes existe!');
  } else {
    console.log('❌ Tabela anuncios_field_changes não existe. Body:', await res2.text());
  }

  console.log('\n🔍 Testando RPC save_anuncio_field...');
  
  const res3 = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/save_anuncio_field`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_anuncio_id: null,
      p_field: 'test_field',
      p_value: 'test_value',
      p_idempotency_key: `test-${Date.now()}`,
      p_organization_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000000'
    })
  });
  
  console.log('Status:', res3.status);
  if (res3.status === 200) {
    const result = await res3.json();
    console.log('✅ RPC save_anuncio_field funciona!');
    console.log('Resultado:', JSON.stringify(result, null, 2));
  } else {
    console.log('❌ RPC save_anuncio_field não existe ou erro. Body:', await res3.text());
  }
}

checkTables().catch(console.error);
