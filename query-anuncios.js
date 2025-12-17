// Script para consultar os anúncios salvos

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

async function queryAnuncios() {
  console.log('\n📊 Consultando anúncios...');
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_ultimate?order=created_at.desc&limit=5`, {
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
  
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_field_changes?order=created_at.desc&limit=10`, {
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
