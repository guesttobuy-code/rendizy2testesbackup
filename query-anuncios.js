// Script para consultar os anúncios salvos

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

async function queryAnuncios() {
  console.log('\n📊 Consultando anúncios...');
  
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/properties?order=created_at.desc&limit=5`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  if (res.status === 200) {
    const anuncios = await res.json();
    console.log(`\n✅ Encontrados ${anuncios.length} anúncios:\n`);
    anuncios.forEach((anuncio, idx) => {
      console.log(`${idx + 1}. ID: ${anuncio.id}`);
      console.log(`   Status: ${anuncio.status}`);
      console.log(`   Criado em: ${anuncio.created_at}`);
      console.log(`   Dados:`, JSON.stringify(anuncio.data, null, 2));
      console.log('');
    });
  } else {
    console.log('❌ Erro ao consultar:', await res.text());
  }

  console.log('\n📊 Consultando histórico de mudanças...');
  
  const res2 = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/anuncios_field_changes?order=created_at.desc&limit=10`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  });
  
  if (res2.status === 200) {
    const changes = await res2.json();
    console.log(`\n✅ Encontrados ${changes.length} registros de mudanças:\n`);
    changes.forEach((change, idx) => {
      console.log(`${idx + 1}. Campo: ${change.field}`);
      console.log(`   Valor: ${JSON.stringify(change.value)}`);
      console.log(`   Idempotency: ${change.idempotency_key}`);
      console.log(`   Criado em: ${change.created_at}`);
      console.log('');
    });
  } else {
    console.log('❌ Erro ao consultar mudanças:', await res2.text());
  }
}

queryAnuncios().catch(console.error);
