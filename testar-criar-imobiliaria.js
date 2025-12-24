/**
 * Script de teste para criar imobiliária via API
 * 
 * Uso: node testar-criar-imobiliaria.js
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const PUBLIC_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) throw new Error('Missing env var SUPABASE_URL');
if (!PUBLIC_ANON_KEY) throw new Error('Missing env var SUPABASE_ANON_KEY');

const BASE_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server/make-server-67caf26a`;

async function criarImobiliaria() {
  const nome = 'Teste Imobiliária';
  const email = 'teste@imobiliaria.com';
  const telefone = '(11) 99999-9999';
  const plano = 'free';

  console.log('🚀 Iniciando teste de criação de imobiliária...\n');
  console.log('📋 Dados:');
  console.log(`   Nome: ${nome}`);
  console.log(`   Email: ${email}`);
  console.log(`   Telefone: ${telefone}`);
  console.log(`   Plano: ${plano}\n`);

  try {
    // 1. Criar organização
    console.log('📤 Enviando requisição POST /organizations...');
    const response = await fetch(`${BASE_URL}/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
        'apikey': PUBLIC_ANON_KEY
      },
      body: JSON.stringify({
        name: nome,
        email: email,
        phone: telefone,
        plan: plano,
        createdBy: 'user_master_rendizy'
      })
    });

    console.log(`📥 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Resposta recebida:', JSON.stringify(result, null, 2));

    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar imobiliária');
    }

    const org = result.data;
    console.log('\n✅ IMOBILIÁRIA CRIADA COM SUCESSO!');
    console.log(`   ID: ${org.id}`);
    console.log(`   Slug: ${org.slug}`);
    console.log(`   Nome: ${org.name}`);
    console.log(`   Email: ${org.email}`);
    console.log(`   Plano: ${org.plan}`);
    console.log(`   Status: ${org.status}`);

    // 2. Verificar se foi criada no banco (buscar por ID)
    console.log('\n🔍 Verificando se foi criada no banco...');
    const verifyResponse = await fetch(`${BASE_URL}/organizations/${org.id}`, {
      headers: {
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
        'apikey': PUBLIC_ANON_KEY
      }
    });

    if (verifyResponse.ok) {
      const verifyResult = await verifyResponse.json();
      if (verifyResult.success) {
        console.log('✅ Verificação: Imobiliária encontrada no banco!');
        console.log(`   Slug verificado: ${verifyResult.data.slug}`);
      } else {
        console.warn('⚠️ Verificação: Imobiliária criada mas não encontrada no banco');
      }
    } else {
      console.warn('⚠️ Verificação: Erro ao buscar imobiliária criada');
    }

    // 3. Verificar se slug é único (buscar por slug)
    console.log('\n🔍 Verificando se slug é único...');
    const slugResponse = await fetch(`${BASE_URL}/organizations/slug/${org.slug}`, {
      headers: {
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
        'apikey': PUBLIC_ANON_KEY
      }
    });

    if (slugResponse.ok) {
      const slugResult = await slugResponse.json();
      if (slugResult.success && slugResult.data.id === org.id) {
        console.log('✅ Verificação: Slug é único e corresponde à imobiliária criada!');
      } else {
        console.warn('⚠️ Verificação: Slug pode não ser único');
      }
    }

    console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
    return org;

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    throw error;
  }
}

// Executar teste
criarImobiliaria()
  .then((org) => {
    console.log('\n🎉 Imobiliária criada com sucesso!');
    console.log(`   Use este ID para testes: ${org.id}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha no teste');
    process.exit(1);
  });
