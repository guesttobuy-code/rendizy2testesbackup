/**
 * Script para testar o módulo financeiro
 * Testa criação de categorias, contas bancárias e lançamentos
 */

import https from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações
const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;
const LOGIN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/auth/login`;

// Ler PUBLIC_ANON_KEY
const infoPath = join(__dirname, '../utils/supabase/info.tsx');
const infoContent = readFileSync(infoPath, 'utf-8');
const anonKeyMatch = infoContent.match(/export const publicAnonKey = ['"]([^'"]+)['"]/);
const PUBLIC_ANON_KEY = anonKeyMatch ? anonKeyMatch[1] : '';

if (!PUBLIC_ANON_KEY) {
  console.error('❌ Erro: PUBLIC_ANON_KEY não encontrada');
  process.exit(1);
}

// Função para fazer requisições
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUBLIC_ANON_KEY}`,
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Função de login
async function login() {
  console.log('🔐 Fazendo login...');
  
  const response = await makeRequest(LOGIN_URL, {
    method: 'POST',
    headers: {
      'apikey': PUBLIC_ANON_KEY,
    },
    body: {
      username: 'rppt',
      password: 'root',
    },
  });

  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Erro no login: ${JSON.stringify(response.data)}`);
  }

  const token = response.data.data?.token || response.data.token;
  if (!token) {
    throw new Error('Token não encontrado na resposta');
  }

  console.log('✅ Login realizado com sucesso');
  return token;
}

// Função para criar categoria
async function criarCategoria(token) {
  console.log('\n📁 Criando categoria...');
  
  const response = await makeRequest(`${BASE_URL}/financeiro/categorias`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': token,
    },
    body: {
      codigo: '1.1',
      nome: 'Receita de Aluguéis',
      tipo: 'receita',
      natureza: 'credora',
      nivel: 2,
    },
  });

  if (response.status === 201 && response.data.success) {
    console.log('✅ Categoria criada:', response.data.data.nome);
    return response.data.data.id;
  } else {
    console.error('❌ Erro ao criar categoria:', response.data);
    return null;
  }
}

// Função para criar conta bancária
async function criarContaBancaria(token) {
  console.log('\n🏦 Criando conta bancária...');
  
  const response = await makeRequest(`${BASE_URL}/financeiro/contas-bancarias`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': token,
    },
    body: {
      nome: 'Conta Principal',
      banco: 'Banco do Brasil',
      agencia: '1234',
      numero: '56789-0',
      tipo: 'corrente',
      moeda: 'BRL',
      saldoInicial: 10000,
      saldo: 10000,
    },
  });

  if (response.status === 201 && response.data.success) {
    console.log('✅ Conta bancária criada:', response.data.data.nome);
    return response.data.data.id;
  } else {
    console.error('❌ Erro ao criar conta bancária:', response.data);
    return null;
  }
}

// Função para criar lançamento
async function criarLancamento(token, categoriaId, contaId) {
  console.log('\n💰 Criando lançamento...');
  
  const response = await makeRequest(`${BASE_URL}/financeiro/lancamentos`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': token,
    },
    body: {
      tipo: 'entrada',
      data: new Date().toISOString().substring(0, 10),
      competencia: new Date().toISOString().substring(0, 10),
      descricao: 'Teste de lançamento - Aluguel recebido',
      valor: 3500,
      moeda: 'BRL',
      categoriaId: categoriaId,
      contaId: contaId,
      conciliado: false,
      hasSplit: false,
    },
  });

  if (response.status === 201 && response.data.success) {
    console.log('✅ Lançamento criado:', response.data.data.descricao);
    return response.data.data.id;
  } else {
    console.error('❌ Erro ao criar lançamento:', response.data);
    return null;
  }
}

// Função para listar lançamentos
async function listarLancamentos(token) {
  console.log('\n📋 Listando lançamentos...');
  
  const response = await makeRequest(`${BASE_URL}/financeiro/lancamentos?limit=10`, {
    headers: {
      'X-Auth-Token': token,
    },
  });

  if (response.status === 200 && response.data.success) {
    const lancamentos = response.data.data?.data || response.data.data || [];
    console.log(`✅ Encontrados ${lancamentos.length} lançamento(s)`);
    lancamentos.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.descricao} - R$ ${l.valor.toFixed(2)} (${l.tipo})`);
    });
    return lancamentos;
  } else {
    console.error('❌ Erro ao listar lançamentos:', response.data);
    return [];
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 Testando Módulo Financeiro\n');
    console.log('=' .repeat(50));

    // 1. Login
    const token = await login();

    // 2. Criar categoria
    const categoriaId = await criarCategoria(token);
    if (!categoriaId) {
      console.error('❌ Não foi possível criar categoria. Abortando.');
      process.exit(1);
    }

    // 3. Criar conta bancária
    const contaId = await criarContaBancaria(token);
    if (!contaId) {
      console.error('❌ Não foi possível criar conta bancária. Abortando.');
      process.exit(1);
    }

    // 4. Criar lançamento
    const lancamentoId = await criarLancamento(token, categoriaId, contaId);
    if (!lancamentoId) {
      console.error('❌ Não foi possível criar lançamento.');
    }

    // 5. Listar lançamentos
    await listarLancamentos(token);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Teste do módulo financeiro concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    process.exit(1);
  }
}

main();

