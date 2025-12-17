/**
 * Script Completo: Testar Módulo Financeiro + Importar Stays.net
 * 
 * 1. Testa criação de despesa e receita no módulo financeiro
 * 2. Importa todos os dados da Stays.net (propriedades, reservas, hóspedes)
 */

import https from 'https';

const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;

const USERNAME = 'rppt';
const PASSWORD = 'root';

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${BASE_URL}${fullPath}`);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': PUBLIC_ANON_KEY,
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
      }
    };

    if (token) {
      options.headers['X-Auth-Token'] = token;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function login() {
  console.log('🔐 Fazendo login...');
  const url = new URL(`https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/auth/login`);
  const data = JSON.stringify({ username: USERNAME, password: PASSWORD });
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
        'apikey': PUBLIC_ANON_KEY,
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          if (res.statusCode === 200 && json.success && (json.token || json.data?.token)) {
            console.log('✅ Login realizado com sucesso!');
            resolve(json.token || json.data.token);
          } else {
            console.error('❌ Erro no login:', json);
            reject(new Error(json.error || 'Login falhou'));
          }
        } catch (e) {
          console.error('❌ Erro ao parsear resposta:', responseData);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function buscarCategorias(token) {
  console.log('\n📋 Buscando categorias...');
  const response = await makeRequest('/financeiro/categorias', 'GET', null, token);
  
  console.log('📡 Status:', response.status);
  console.log('📡 Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
  
  if (response.status === 200 && response.data.success) {
    const categorias = response.data.data || [];
    const receita = categorias.find(c => c.tipo === 'receita' && c.codigo?.startsWith('3.'));
    const despesa = categorias.find(c => c.tipo === 'despesa' && c.codigo?.startsWith('4.'));
    
    console.log(`✅ ${categorias.length} categorias encontradas`);
    if (!receita) {
      console.log('⚠️  Nenhuma categoria de receita encontrada, usando primeira receita disponível');
      const primeiraReceita = categorias.find(c => c.tipo === 'receita');
      if (primeiraReceita) return { receita: primeiraReceita.id, despesa: despesa?.id };
    }
    if (!despesa) {
      console.log('⚠️  Nenhuma categoria de despesa encontrada, usando primeira despesa disponível');
      const primeiraDespesa = categorias.find(c => c.tipo === 'despesa');
      if (primeiraDespesa) return { receita: receita?.id, despesa: primeiraDespesa.id };
    }
    return { receita: receita?.id, despesa: despesa?.id };
  }
  
  throw new Error(`Erro ao buscar categorias: ${JSON.stringify(response.data)}`);
}

async function buscarContasBancarias(token) {
  console.log('\n🏦 Buscando contas bancárias...');
  const response = await makeRequest('/financeiro/contas-bancarias', 'GET', null, token);
  
  if (response.status === 200 && response.data.success) {
    const contas = response.data.data || [];
    console.log(`✅ ${contas.length} contas encontradas`);
    
    if (contas.length === 0) {
      // Criar uma conta padrão
      console.log('📝 Criando conta bancária padrão...');
      const novaConta = {
        nome: 'Conta Principal',
        tipo: 'corrente',
        banco: 'Banco do Brasil',
        agencia: '0000',
        conta: '00000-0',
        saldoInicial: 0,
      };
      
      const createResponse = await makeRequest('/financeiro/contas-bancarias', 'POST', novaConta, token);
      if (createResponse.status === 201 && createResponse.data.success) {
        console.log('✅ Conta bancária criada!');
        return createResponse.data.data.id;
      }
    }
    
    return contas[0]?.id;
  }
  
  throw new Error('Erro ao buscar contas bancárias');
}

async function criarReceita(token, categoriaId, contaId) {
  console.log('\n💰 Criando receita...');
  
  const hoje = new Date().toISOString().split('T')[0];
  const receita = {
    tipo: 'entrada',
    data: hoje,
    competencia: hoje,
    descricao: 'Teste de Receita - Aluguel de Temporada',
    valor: 2500.00,
    moeda: 'BRL',
    categoriaId: categoriaId,
    contaId: contaId,
    documento: `REC-TEST-${Date.now()}`,
    observacoes: 'Receita criada via script de teste',
  };
  
  const response = await makeRequest('/financeiro/lancamentos', 'POST', receita, token);
  
  if (response.status === 201 && response.data.success) {
    console.log('✅ Receita criada com sucesso!');
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Valor: R$ ${response.data.data.valor.toFixed(2)}`);
    return response.data.data;
  } else {
    console.error('❌ Erro ao criar receita:', response.data);
    throw new Error(response.data.error || 'Erro ao criar receita');
  }
}

async function criarDespesa(token, categoriaId, contaId) {
  console.log('\n💸 Criando despesa...');
  
  const hoje = new Date().toISOString().split('T')[0];
  const despesa = {
    tipo: 'saida',
    data: hoje,
    competencia: hoje,
    descricao: 'Teste de Despesa - Limpeza e Manutenção',
    valor: 350.00,
    moeda: 'BRL',
    categoriaId: categoriaId,
    contaId: contaId,
    documento: `DESP-TEST-${Date.now()}`,
    observacoes: 'Despesa criada via script de teste',
  };
  
  const response = await makeRequest('/financeiro/lancamentos', 'POST', despesa, token);
  
  if (response.status === 201 && response.data.success) {
    console.log('✅ Despesa criada com sucesso!');
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   Valor: R$ ${response.data.data.valor.toFixed(2)}`);
    return response.data.data;
  } else {
    console.error('❌ Erro ao criar despesa:', response.data);
    throw new Error(response.data.error || 'Erro ao criar despesa');
  }
}

async function verificarLancamentos(token) {
  console.log('\n🔍 Verificando lançamentos criados...');
  const response = await makeRequest('/financeiro/lancamentos', 'GET', null, token);
  
  if (response.status === 200 && response.data.success) {
    const lancamentos = response.data.data?.data || [];
    console.log(`✅ ${lancamentos.length} lançamentos encontrados no total`);
    
    const receitas = lancamentos.filter(l => l.tipo === 'entrada');
    const despesas = lancamentos.filter(l => l.tipo === 'saida');
    
    console.log(`   💰 Receitas: ${receitas.length}`);
    console.log(`   💸 Despesas: ${despesas.length}`);
    
    return { receitas, despesas };
  }
  
  throw new Error('Erro ao verificar lançamentos');
}

async function salvarConfiguracaoStaysNet(token) {
  console.log('\n💾 Salvando configuração Stays.net...');
  
  const config = {
    apiKey: 'a5146970',
    apiSecret: 'bfcf4daf',
    baseUrl: 'https://bvm.stays.net/external/v1',
    accountName: 'Sua Casa Rende Mais',
    scope: 'global',
    enabled: true,
  };
  
  const response = await makeRequest('/settings/staysnet', 'POST', config, token);
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ Configuração Stays.net salva com sucesso!');
    return true;
  } else {
    console.warn('⚠️  Erro ao salvar configuração:', response.data);
    return false;
  }
}

async function importarStaysNet(token) {
  console.log('\n\n🚀 ========================================');
  console.log('🚀 IMPORTANDO DADOS DA STAYS.NET');
  console.log('🚀 ========================================');
  
  // Primeiro, garantir que a configuração está salva
  await salvarConfiguracaoStaysNet(token);
  
  const importData = {
    selectedPropertyIds: [], // Vazio = importar todas
    startDate: '2025-01-01',
    endDate: '2026-12-31',
  };
  
  console.log('\n📅 Período de importação:');
  console.log(`   Início: ${importData.startDate}`);
  console.log(`   Fim: ${importData.endDate}`);
  console.log('📦 Importando todas as propriedades...');
  
  const response = await makeRequest('/staysnet/import/full', 'POST', importData, token);
  
  if (response.status === 200 && response.data.success) {
    const stats = response.data.stats || {};
    
    console.log('\n✅ Importação concluída!');
    console.log('\n📊 ESTATÍSTICAS:');
    console.log('\n👥 HÓSPEDES:');
    console.log(`   Buscados: ${stats.guests?.fetched || 0}`);
    console.log(`   Criados: ${stats.guests?.created || 0}`);
    console.log(`   Atualizados: ${stats.guests?.updated || 0}`);
    console.log(`   Falharam: ${stats.guests?.failed || 0}`);
    
    console.log('\n🏠 PROPRIEDADES:');
    console.log(`   Buscadas: ${stats.properties?.fetched || 0}`);
    console.log(`   Criadas: ${stats.properties?.created || 0}`);
    console.log(`   Atualizadas: ${stats.properties?.updated || 0}`);
    console.log(`   Falharam: ${stats.properties?.failed || 0}`);
    
    console.log('\n📅 RESERVAS:');
    console.log(`   Buscadas: ${stats.reservations?.fetched || 0}`);
    console.log(`   Criadas: ${stats.reservations?.created || 0}`);
    console.log(`   Atualizadas: ${stats.reservations?.updated || 0}`);
    console.log(`   Falharam: ${stats.reservations?.failed || 0}`);
    
    if (stats.errors && stats.errors.length > 0) {
      console.log('\n⚠️  ERROS:');
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
    }
    
    return stats;
  } else {
    console.error('❌ Erro na importação:', response.data);
    throw new Error(response.data.error || 'Erro ao importar dados da Stays.net');
  }
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   TESTE COMPLETO: FINANCEIRO + STAYS.NET');
    console.log('═══════════════════════════════════════════════════════');
    
    // 1. Login
    const token = await login();
    
    // 2. TESTE DO MÓDULO FINANCEIRO
    console.log('\n\n💰 ========================================');
    console.log('💰 TESTANDO MÓDULO FINANCEIRO');
    console.log('💰 ========================================');
    
    const categorias = await buscarCategorias(token);
    const contaId = await buscarContasBancarias(token);
    
    if (!categorias.receita || !categorias.despesa || !contaId) {
      throw new Error('Não foi possível obter categorias ou conta bancária');
    }
    
    const receita = await criarReceita(token, categorias.receita, contaId);
    const despesa = await criarDespesa(token, categorias.despesa, contaId);
    
    // Aguardar um pouco para garantir persistência
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lancamentos = await verificarLancamentos(token);
    
    console.log('\n✅ TESTE FINANCEIRO CONCLUÍDO!');
    console.log(`   Receita criada: ${receita.id}`);
    console.log(`   Despesa criada: ${despesa.id}`);
    console.log(`   Total de lançamentos: ${lancamentos.receitas.length + lancamentos.despesas.length}`);
    
    // 3. IMPORTAR STAYS.NET
    const stats = await importarStaysNet(token);
    
    // RESUMO FINAL
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('   ✅ TUDO CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 RESUMO:');
    console.log(`   ✅ Receita criada: ${receita.id}`);
    console.log(`   ✅ Despesa criada: ${despesa.id}`);
    console.log(`   ✅ Hóspedes importados: ${stats.guests?.created || 0}`);
    console.log(`   ✅ Propriedades importadas: ${stats.properties?.created || 0}`);
    console.log(`   ✅ Reservas importadas: ${stats.reservations?.created || 0}`);
    console.log('\n🎉 Tarefas concluídas!');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

