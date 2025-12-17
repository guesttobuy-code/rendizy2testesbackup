// Script para verificar se migrations foram aplicadas
import 'dotenv/config';

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzc1MTAyNCwiZXhwIjoyMDQ5MzI3MDI0fQ.zU8HYmEz2S1sInJI/1I6.lmOkYzduemZ/W1ycU54dG1dG11dG14GN4CCI6MjA0OTMyNzAyNH0.KXYSQ6uVKIx7I7IhgH4pqeLvb0Kv1WTqnE3cBY8-LXE';

console.log('🔍 Verificando infraestrutura do banco...\n');

async function verificarTabela(tableName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
    
    if (res.ok) {
      console.log(`✅ Tabela '${tableName}' existe e está acessível`);
      return true;
    } else {
      const text = await res.text();
      console.log(`❌ Tabela '${tableName}' ERRO ${res.status}: ${text}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao verificar '${tableName}': ${err.message}`);
    return false;
  }
}

async function verificarRPC() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_anuncio_field`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_anuncio_id: null,
        p_field: 'test',
        p_value: 'test_value',
        p_idempotency_key: `test-${Date.now()}`
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ RPC 'save_anuncio_field' funciona! Retornou:`, data);
      return true;
    } else {
      const text = await res.text();
      console.log(`❌ RPC 'save_anuncio_field' ERRO ${res.status}: ${text}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao testar RPC: ${err.message}`);
    return false;
  }
}

async function verificarEdgeFunction() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/anuncio-ultimate/save-field`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field: 'test_edge',
        value: 'test_value_edge',
        idempotency_key: `edge-test-${Date.now()}`
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Edge Function '/anuncio-ultimate/save-field' funciona! Retornou:`, data);
      return true;
    } else {
      const text = await res.text();
      console.log(`❌ Edge Function ERRO ${res.status}: ${text}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Erro ao testar Edge Function: ${err.message}`);
    return false;
  }
}

// Executar verificações
(async () => {
  console.log('1️⃣ Verificando tabela anuncios_ultimate...');
  const tabela1 = await verificarTabela('anuncios_ultimate');
  
  console.log('\n2️⃣ Verificando tabela anuncios_field_changes...');
  const tabela2 = await verificarTabela('anuncios_field_changes');
  
  console.log('\n3️⃣ Testando RPC save_anuncio_field...');
  const rpc = await verificarRPC();
  
  console.log('\n4️⃣ Testando Edge Function...');
  const edge = await verificarEdgeFunction();
  
  console.log('\n📊 RESULTADO FINAL:');
  console.log('═══════════════════════════════════════');
  console.log(`Tabela anuncios_ultimate:      ${tabela1 ? '✅' : '❌'}`);
  console.log(`Tabela anuncios_field_changes: ${tabela2 ? '✅' : '❌'}`);
  console.log(`RPC save_anuncio_field:        ${rpc ? '✅' : '❌'}`);
  console.log(`Edge Function:                 ${edge ? '✅' : '❌'}`);
  console.log('═══════════════════════════════════════');
  
  if (tabela1 && tabela2 && rpc && edge) {
    console.log('\n🎉 INFRAESTRUTURA 100% PRONTA! Pode avançar para próximos campos.');
  } else {
    console.log('\n⚠️  AÇÃO NECESSÁRIA: Aplicar migrations e/ou deployar edge function.');
  }
})();
