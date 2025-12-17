/**
 * Script de Teste: Sincronização Completa Stays.net
 * 
 * Testa a importação completa de hóspedes, propriedades e reservas
 */

import https from 'https';

const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';
const BASE_URL_AUTH = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/auth`;
const BASE_URL_WITH_MAKE = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;

// Credenciais de teste (Rendizy)
const USERNAME = 'rppt';
const PASSWORD = 'root';

// ⚠️ NOTA: As credenciais da Stays.net devem estar configuradas no banco de dados
// via interface de configuração (Configurações → Integrações → Stays.net)
// Credenciais encontradas na documentação:
// - Base URL: https://bvm.stays.net/external/v1
// - API Key: a5146970
// - API Secret: bfcf4daf
// - Account Name: Sua Casa Rende Mais

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`https://${PROJECT_ID}.supabase.co/functions/v1${fullPath}`);
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
  const url = new URL(`${BASE_URL_AUTH}/login`);
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
        console.log('📡 Status:', res.statusCode);
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200 && parsed.success) {
            console.log('✅ Login realizado com sucesso!');
            // Token pode estar em parsed.token ou parsed.data.token
            const token = parsed.token || parsed.data?.token;
            if (!token) {
              reject(new Error(`Token não encontrado na resposta: ${JSON.stringify(parsed)}`));
              return;
            }
            resolve(token);
          } else {
            reject(new Error(`Erro no login: ${parsed.error || parsed.message || JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Erro ao parsear resposta: ${responseData.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testarSincronizacaoCompleta(token) {
  console.log('\n🚀 Iniciando sincronização completa Stays.net...');
  console.log('='.repeat(60));
  
  const response = await makeRequest('/rendizy-server/make-server-67caf26a/staysnet/import/full', 'POST', {
    // Opcional: IDs específicos de propriedades para importar
    // selectedPropertyIds: [],
    // Opcional: Datas para reservas
    // startDate: '2025-01-01',
    // endDate: '2026-12-31',
  }, token);

  if (response.status !== 200) {
    throw new Error(`Erro na sincronização: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function main() {
  try {
    console.log('🧪 TESTE: Sincronização Completa Stays.net');
    console.log('='.repeat(60));
    
    // 1. Login
    const token = await login();
    
    // 2. Executar sincronização completa
    const resultado = await testarSincronizacaoCompleta(token);
    
    // 3. Exibir resultados
    console.log('\n📊 RESULTADO DA SINCRONIZAÇÃO:');
    console.log('='.repeat(60));
    
    if (resultado.success) {
      console.log('✅ Sincronização realizada com sucesso!');
      console.log('\n📈 Estatísticas:');
      
      const stats = resultado.data.stats;
      
      console.log('\n👥 HÓSPEDES:');
      console.log(`   Buscados: ${stats.guests.fetched}`);
      console.log(`   Criados: ${stats.guests.created}`);
      console.log(`   Atualizados: ${stats.guests.updated}`);
      console.log(`   Falharam: ${stats.guests.failed}`);
      
      console.log('\n🏠 PROPRIEDADES:');
      console.log(`   Buscadas: ${stats.properties.fetched}`);
      console.log(`   Criadas: ${stats.properties.created}`);
      console.log(`   Atualizadas: ${stats.properties.updated}`);
      console.log(`   Falharam: ${stats.properties.failed}`);
      
      console.log('\n📅 RESERVAS:');
      console.log(`   Buscadas: ${stats.reservations.fetched}`);
      console.log(`   Criadas: ${stats.reservations.created}`);
      console.log(`   Atualizadas: ${stats.reservations.updated}`);
      console.log(`   Falharam: ${stats.reservations.failed}`);
      
      if (stats.errors && stats.errors.length > 0) {
        console.log('\n⚠️  ERROS:');
        stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      
      console.log('\n✅ Tripé fundamental sincronizado:');
      console.log(`   ✅ ${stats.guests.created + stats.guests.updated} hóspedes`);
      console.log(`   ✅ ${stats.properties.created + stats.properties.updated} propriedades`);
      console.log(`   ✅ ${stats.reservations.created + stats.reservations.updated} reservas`);
      console.log(`   ✅ Blocks criados automaticamente no calendário para cada reserva`);
      
    } else {
      console.log('❌ Sincronização concluída com erros');
      console.log('\n📊 Estatísticas:');
      console.log(JSON.stringify(resultado.data.stats, null, 2));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Teste concluído!');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
