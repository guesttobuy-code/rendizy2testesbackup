/**
 * Script de Teste - API Stays.net
 * Testa conexão real e busca dados
 */

const credentials = {
  apiKey: 'a5146970',
  apiSecret: 'bfcf4daf',
  baseUrl: 'https://bvm.stays.net/external/v1'
};

// Criar Basic Auth
const basicAuth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${credentials.baseUrl}${endpoint}`;
  
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 TESTANDO: ${method} ${endpoint}`);
  console.log('='.repeat(80));
  console.log(`URL: ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}`);
    
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log(`Resposta (primeiros 500 chars): ${text.substring(0, 500)}`);
      return { success: false, error: 'Resposta não é JSON', text: text.substring(0, 500) };
    }
    
    if (!response.ok) {
      console.log('❌ ERRO:', JSON.stringify(data, null, 2));
      return { success: false, error: data.message || data.error || 'Erro desconhecido', data };
    }
    
    // Analisar estrutura
    console.log('\n📊 ESTRUTURA DA RESPOSTA:');
    console.log(`Tipo: ${typeof data}`);
    console.log(`É array? ${Array.isArray(data)}`);
    
    if (Array.isArray(data)) {
      console.log(`Total de itens: ${data.length}`);
      if (data.length > 0) {
        console.log('\n📋 PRIMEIRO ITEM:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    } else if (data && typeof data === 'object') {
      console.log(`Chaves: ${Object.keys(data).join(', ')}`);
      
      // Verificar se tem array dentro
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          console.log(`  • ${key}: array com ${data[key].length} itens`);
          if (data[key].length > 0) {
            console.log(`    Primeiro item de ${key}:`);
            console.log(JSON.stringify(data[key][0], null, 2).substring(0, 1000));
          }
        }
      }
      
      // Mostrar estrutura completa (limitado)
      console.log('\n📋 ESTRUTURA COMPLETA (primeiros 2000 chars):');
      console.log(JSON.stringify(data, null, 2).substring(0, 2000));
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 INICIANDO TESTES DA API STAYS.NET');
  console.log(`Base URL: ${credentials.baseUrl}`);
  console.log(`API Key: ${credentials.apiKey.substring(0, 4)}****`);
  
  const results = {};
  
  // Teste 1: Clients (Hóspedes)
  results.clients = await testEndpoint('/booking/clients', 'GET');
  
  // Teste 2: Properties
  results.properties = await testEndpoint('/content/properties', 'GET');
  
  // Teste 3: Listings
  results.listings = await testEndpoint('/content/listings', 'GET');
  
  // Teste 4: Reservations
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 365);
  
  const reservationsEndpoint = `/booking/reservations?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&dateType=arrival`;
  results.reservations = await testEndpoint(reservationsEndpoint, 'GET');
  
  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(80));
  for (const [key, result] of Object.entries(results)) {
    console.log(`${key}: ${result.success ? '✅ SUCESSO' : '❌ FALHOU'}`);
    if (result.success && Array.isArray(result.data)) {
      console.log(`  → ${result.data.length} itens encontrados`);
    }
  }
  
  // Salvar resultados em arquivo
  const fs = require('fs');
  fs.writeFileSync('staysnet-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n💾 Resultados salvos em: staysnet-test-results.json');
}

runTests().catch(console.error);

