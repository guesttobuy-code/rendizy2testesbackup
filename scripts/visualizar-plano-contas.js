/**
 * Script para visualizar a estrutura do Plano de Contas
 * Busca todas as categorias e exibe em formato hierárquico
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
          reject(new Error(`Erro ao parsear JSON: ${e.message}\nResposta: ${responseData.substring(0, 200)}`));
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
          reject(new Error('Erro ao parsear resposta do login'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });

  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Erro no login: ${JSON.stringify(response.data)}`);
  }

  const token = response.data.token || response.data.data?.token;
  if (!token) {
    throw new Error('Token não encontrado na resposta');
  }

  console.log('✅ Login realizado com sucesso\n');
  return token;
}

async function buscarCategorias(token) {
  console.log('📋 Buscando categorias do plano de contas...\n');
  
  const response = await makeRequest('/financeiro/categorias', 'GET', null, token);
  
  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Erro ao buscar categorias: ${JSON.stringify(response.data)}`);
  }

  return response.data.data || [];
}

function construirHierarquia(categorias) {
  // Remover duplicatas por código (manter apenas a primeira ocorrência de cada código)
  const categoriasUnicas = [];
  const codigosVistos = new Set();
  
  categorias.forEach(cat => {
    const codigo = cat.codigo || '';
    if (!codigosVistos.has(codigo)) {
      codigosVistos.add(codigo);
      categoriasUnicas.push(cat);
    }
  });

  const mapa = new Map();
  const raizes = [];

  // Criar mapa de categorias
  categoriasUnicas.forEach(cat => {
    mapa.set(cat.id, { ...cat, children: [] });
  });

  // Construir árvore
  categoriasUnicas.forEach(cat => {
    const node = mapa.get(cat.id);
    if (cat.parentId && mapa.has(cat.parentId)) {
      const parent = mapa.get(cat.parentId);
      parent.children.push(node);
    } else {
      raizes.push(node);
    }
  });

  // Ordenar por código
  const ordenar = (nodes) => {
    nodes.sort((a, b) => {
      const codA = a.codigo || '';
      const codB = b.codigo || '';
      return codA.localeCompare(codB, undefined, { numeric: true, sensitivity: 'base' });
    });
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        ordenar(node.children);
      }
    });
  };

  ordenar(raizes);
  return raizes;
}

function exibirHierarquia(categorias, nivel = 0, prefixo = '') {
  categorias.forEach((cat, index) => {
    const isUltimo = index === categorias.length - 1;
    const prefixoAtual = isUltimo ? '└── ' : '├── ';
    const prefixoFilhos = isUltimo ? '    ' : '│   ';
    
    const indentacao = '  '.repeat(nivel);
    const codigo = cat.codigo || 'N/A';
    const nome = cat.nome || 'Sem nome';
    const tipo = cat.tipo === 'receita' ? '💰 RECEITA' : '💸 DESPESA';
    const natureza = cat.natureza || 'N/A';
    const status = cat.ativo ? '✅' : '❌';
    
    console.log(`${prefixo}${prefixoAtual} ${codigo.padEnd(8)} | ${tipo.padEnd(12)} | ${nome}`);
    
    if (cat.children && cat.children.length > 0) {
      exibirHierarquia(cat.children, nivel + 1, prefixo + prefixoFilhos);
    }
  });
}

function exibirEstatisticas(categorias) {
  // Remover duplicatas para estatísticas
  const codigosVistos = new Set();
  const categoriasUnicas = categorias.filter(cat => {
    const codigo = cat.codigo || '';
    if (!codigosVistos.has(codigo)) {
      codigosVistos.add(codigo);
      return true;
    }
    return false;
  });

  const total = categoriasUnicas.length;
  const receitas = categoriasUnicas.filter(c => c.tipo === 'receita').length;
  const despesas = categoriasUnicas.filter(c => c.tipo === 'despesa').length;
  const ativas = categoriasUnicas.filter(c => c.ativo).length;
  const inativas = categoriasUnicas.filter(c => !c.ativo).length;
  const comFilhos = categoriasUnicas.filter(c => {
    const filhos = categoriasUnicas.filter(f => f.parentId === c.id);
    return filhos.length > 0;
  }).length;
  const semFilhos = total - comFilhos;

  console.log('\n' + '='.repeat(80));
  console.log('📊 ESTATÍSTICAS DO PLANO DE CONTAS');
  console.log('='.repeat(80));
  console.log(`Total de Categorias:        ${total}`);
  console.log(`  ├─ Receitas:              ${receitas}`);
  console.log(`  └─ Despesas:              ${despesas}`);
  console.log(`Status:`);
  console.log(`  ├─ Ativas:                ${ativas}`);
  console.log(`  └─ Inativas:              ${inativas}`);
  console.log(`Hierarquia:`);
  console.log(`  ├─ Categorias Pai:        ${comFilhos}`);
  console.log(`  └─ Categorias Filhas:     ${semFilhos}`);
  console.log('='.repeat(80) + '\n');
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   ESTRUTURA DO PLANO DE CONTAS - RENDIZY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // 1. Login
    const token = await login();
    
    // 2. Buscar categorias
    const categorias = await buscarCategorias(token);
    
    if (categorias.length === 0) {
      console.log('⚠️  Nenhuma categoria encontrada no plano de contas.');
      return;
    }

    // 3. Construir hierarquia
    const hierarquia = construirHierarquia(categorias);
    
    // 4. Exibir estatísticas
    exibirEstatisticas(categorias);
    
    // 5. Exibir hierarquia
    console.log('📋 ESTRUTURA HIERÁRQUICA DO PLANO DE CONTAS');
    console.log('='.repeat(80));
    console.log('Código     | Tipo         | Nome');
    console.log('-'.repeat(80));
    
    exibirHierarquia(hierarquia);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Visualização concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

