// Script para testar criação e listagem de categorias
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL) throw new Error('Missing env var SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing env var SUPABASE_ANON_KEY');

const API_BASE = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server`;
const token = process.argv[2] || '';

async function testarCategorias() {
  // 1. Listar categorias existentes
  console.log('📋 Listando categorias existentes...');
  const listRes = await fetch(`${API_BASE}/rendizy-server/make-server-67caf26a/financeiro/categorias`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    }
  });
  
  const listData = await listRes.json();
  console.log('✅ Categorias encontradas:', listData);
  
  // 2. Criar categoria teste
  console.log('\n➕ Criando categoria teste...');
  const createRes = await fetch(`${API_BASE}/rendizy-server/make-server-67caf26a/financeiro/categorias`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    },
    body: JSON.stringify({
      codigo: '9.9.9',
      nome: 'Categoria Teste',
      tipo: 'receita',
      natureza: 'credora'
    })
  });
  
  const createData = await createRes.json();
  console.log('✅ Categoria criada:', createData);
  
  // 3. Listar novamente
  console.log('\n📋 Listando categorias após criação...');
  const listRes2 = await fetch(`${API_BASE}/rendizy-server/make-server-67caf26a/financeiro/categorias`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    }
  });
  
  const listData2 = await listRes2.json();
  console.log('\n📊 LISTA COMPLETA DE CATEGORIAS:');
  console.log(JSON.stringify(listData2, null, 2));
}

testarCategorias().catch(console.error);

