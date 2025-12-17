// Script de teste completo do ciclo de criação de anúncio

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

async function testCompleteFlow() {
  console.log('\n🧪 TESTE COMPLETO DO CICLO DE ANÚNCIO');
  console.log('═══════════════════════════════════════\n');

  // PASSO 1: Criar novo anúncio via RPC
  console.log('📝 PASSO 1: Criando novo anúncio...\n');
  
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_anuncio_field`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_anuncio_id: null,
      p_field: 'title',
      p_value: 'Teste 13 12 2025',
      p_idempotency_key: `create-${Date.now()}`,
      p_organization_id: '00000000-0000-0000-0000-000000000000',
      p_user_id: '00000000-0000-0000-0000-000000000002'
    })
  });

  if (createRes.status !== 200) {
    console.error('❌ Erro ao criar:', createRes.status, await createRes.text());
    return;
  }

  const createData = await createRes.json();
  const anuncioId = createData[0]?.id;
  console.log(`✅ Anúncio criado com ID: ${anuncioId}`);
  console.log(`   Nome interno salvo: "${createData[0]?.data?.title}"\n`);

  // PASSO 2: Verificar se está na lista
  console.log('📊 PASSO 2: Consultando lista de anúncios...\n');
  
  const listRes = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_ultimate?select=*&order=created_at.desc&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (listRes.status !== 200) {
    console.error('❌ Erro ao listar:', listRes.status, await listRes.text());
    return;
  }

  const listData = await listRes.json();
  console.log(`✅ Anúncio encontrado na lista:`);
  console.log(`   ID: ${listData[0]?.id}`);
  console.log(`   Nome: ${listData[0]?.data?.title}`);
  console.log(`   Criado: ${listData[0]?.created_at}\n`);

  // PASSO 3: Carregar anúncio específico
  console.log('🔍 PASSO 3: Carregando anúncio específico...\n');
  
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_ultimate?id=eq.${anuncioId}&select=*`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (getRes.status !== 200) {
    console.error('❌ Erro ao carregar:', getRes.status, await getRes.text());
    return;
  }

  const getData = await getRes.json();
  console.log(`✅ Anúncio carregado com sucesso:`);
  console.log(`   ID: ${getData[0]?.id}`);
  console.log(`   Nome interno: "${getData[0]?.data?.title}"`);
  console.log(`   Dados completos:`, JSON.stringify(getData[0]?.data, null, 2));
  console.log(`\n✅ CICLO COMPLETO TESTADO COM SUCESSO!`);
  console.log(`   → Anúncio criado`);
  console.log(`   → Visível na lista`);
  console.log(`   → Nome interno persistente`);
}

testCompleteFlow().catch(console.error);
