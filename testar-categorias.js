// Script para testar criação e listagem de categorias
const API_BASE = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server';
const token = process.argv[2] || '';

async function testarCategorias() {
  // 1. Listar categorias existentes
  console.log('📋 Listando categorias existentes...');
  const listRes = await fetch(`${API_BASE}/rendizy-server/make-server-67caf26a/financeiro/categorias`, {
    headers: {
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzY4MDAsImV4cCI6MjA0ODA1MjgwMH0.7vJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq`,
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
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzY4MDAsImV4cCI6MjA0ODA1MjgwMH0.7vJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq`,
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
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NzY4MDAsImV4cCI6MjA0ODA1MjgwMH0.7vJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq`,
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    }
  });
  
  const listData2 = await listRes2.json();
  console.log('\n📊 LISTA COMPLETA DE CATEGORIAS:');
  console.log(JSON.stringify(listData2, null, 2));
}

testarCategorias().catch(console.error);

