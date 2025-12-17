/**
 * Script: Sincronização Completa Stays.net com Dados Reais
 * 
 * Sincroniza:
 * - TODAS as 162 propriedades
 * - TODAS as reservas de 01/01/2025 até 31/12/2026
 * - TODOS os hóspedes desse período
 * 
 * E exibe os dados na tela após sincronização
 */

import https from 'https';

const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';
const BASE_URL_AUTH = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/auth`;
const BASE_URL_WITH_MAKE = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;

// Credenciais Rendizy
const USERNAME = 'rppt';
const PASSWORD = 'root';

// Configuração Stays.net (encontrada na documentação)
const STAYSNET_CONFIG = {
  apiKey: 'a5146970',
  apiSecret: 'bfcf4daf',
  baseUrl: 'https://bvm.stays.net/external/v1',
  accountName: 'Sua Casa Rende Mais',
  scope: 'global',
  enabled: true
};

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
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200 && parsed.success) {
            console.log('✅ Login realizado com sucesso!');
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

async function salvarConfiguracaoStaysNet(token) {
  console.log('\n💾 Salvando configuração Stays.net...');
  
  const response = await makeRequest('/rendizy-server/make-server-67caf26a/settings/staysnet', 'POST', STAYSNET_CONFIG, token);
  
  if (response.status === 200 && response.data.success) {
    console.log('✅ Configuração salva com sucesso!');
    return true;
  } else {
    console.warn('⚠️  Erro ao salvar configuração:', response.data);
    return false;
  }
}

async function executarSincronizacaoCompleta(token) {
  console.log('\n🚀 Iniciando sincronização completa Stays.net...');
  console.log('='.repeat(60));
  console.log('📋 Parâmetros:');
  console.log('   • TODAS as propriedades (162)');
  console.log('   • Reservas: 01/01/2025 até 31/12/2026');
  console.log('   • TODOS os hóspedes desse período');
  console.log('='.repeat(60));
  
  const response = await makeRequest('/rendizy-server/make-server-67caf26a/staysnet/import/full', 'POST', {
    // Não especificar selectedPropertyIds = importar TODAS
    startDate: '2025-01-01',
    endDate: '2026-12-31',
  }, token);

  if (response.status !== 200) {
    throw new Error(`Erro na sincronização: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function buscarDadosSincronizados(token) {
  console.log('\n📊 Buscando dados sincronizados...');
  
  const [guestsRes, propertiesRes, reservationsRes] = await Promise.all([
    makeRequest('/rendizy-server/make-server-67caf26a/guests', 'GET', null, token),
    makeRequest('/rendizy-server/make-server-67caf26a/properties', 'GET', null, token),
    makeRequest('/rendizy-server/make-server-67caf26a/reservations', 'GET', null, token),
  ]);

  return {
    guests: guestsRes.data.success ? guestsRes.data.data : [],
    properties: propertiesRes.data.success ? propertiesRes.data.data : [],
    reservations: reservationsRes.data.success ? reservationsRes.data.data : [],
  };
}

function exibirDados(dados) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DADOS SINCRONIZADOS - EXIBIÇÃO COMPLETA');
  console.log('='.repeat(80));
  
  // HÓSPEDES
  console.log('\n👥 HÓSPEDES (' + dados.guests.length + '):');
  console.log('-'.repeat(80));
  dados.guests.slice(0, 10).forEach((guest, index) => {
    console.log(`${index + 1}. ${guest.fullName || `${guest.firstName} ${guest.lastName}`.trim()}`);
    console.log(`   📧 ${guest.email || 'N/A'}`);
    console.log(`   📱 ${guest.phone || 'N/A'}`);
    console.log(`   🆔 ${guest.id}`);
    console.log('');
  });
  if (dados.guests.length > 10) {
    console.log(`   ... e mais ${dados.guests.length - 10} hóspedes`);
  }
  
  // PROPRIEDADES
  console.log('\n🏠 PROPRIEDADES (' + dados.properties.length + '):');
  console.log('-'.repeat(80));
  dados.properties.slice(0, 10).forEach((property, index) => {
    console.log(`${index + 1}. ${property.name || property.code || 'Sem nome'}`);
    console.log(`   🆔 ${property.id}`);
    console.log(`   📍 ${property.address?.street || 'N/A'}, ${property.address?.city || 'N/A'}`);
    console.log(`   💰 R$ ${property.pricing?.basePrice || property.basePrice || 'N/A'}/noite`);
    console.log(`   🛏️  ${property.bedrooms || 'N/A'} quartos, ${property.beds || 'N/A'} camas`);
    console.log('');
  });
  if (dados.properties.length > 10) {
    console.log(`   ... e mais ${dados.properties.length - 10} propriedades`);
  }
  
  // RESERVAS
  console.log('\n📅 RESERVAS (' + dados.reservations.length + '):');
  console.log('-'.repeat(80));
  dados.reservations.slice(0, 10).forEach((reservation, index) => {
    console.log(`${index + 1}. Reserva ${reservation.id}`);
    console.log(`   📅 Check-in: ${reservation.checkIn} → Check-out: ${reservation.checkOut}`);
    console.log(`   👥 ${reservation.guests?.adults || reservation.adults || 'N/A'} adultos, ${reservation.guests?.children || reservation.children || 0} crianças`);
    console.log(`   💰 R$ ${reservation.pricing?.total || reservation.totalPrice || 'N/A'}`);
    console.log(`   🏠 Propriedade: ${reservation.propertyId}`);
    console.log(`   👤 Hóspede: ${reservation.guestId}`);
    console.log(`   📊 Status: ${reservation.status || 'N/A'}`);
    console.log('');
  });
  if (dados.reservations.length > 10) {
    console.log(`   ... e mais ${dados.reservations.length - 10} reservas`);
  }
  
  // RESUMO
  console.log('\n' + '='.repeat(80));
  console.log('📈 RESUMO FINAL:');
  console.log('='.repeat(80));
  console.log(`✅ Hóspedes: ${dados.guests.length}`);
  console.log(`✅ Propriedades: ${dados.properties.length}`);
  console.log(`✅ Reservas: ${dados.reservations.length}`);
  console.log('='.repeat(80));
}

async function main() {
  try {
    console.log('🧪 SINCRONIZAÇÃO COMPLETA STAYS.NET');
    console.log('='.repeat(60));
    
    // 1. Login
    const token = await login();
    
    // 2. Salvar configuração Stays.net (se necessário)
    await salvarConfiguracaoStaysNet(token);
    
    // 3. Executar sincronização completa
    const resultado = await executarSincronizacaoCompleta(token);
    
    // 4. Exibir estatísticas da sincronização
    console.log('\n📊 RESULTADO DA SINCRONIZAÇÃO:');
    console.log('='.repeat(60));
    
    if (resultado.success) {
      const stats = resultado.data.stats;
      
      console.log('✅ Sincronização realizada com sucesso!');
      console.log('\n📈 Estatísticas:');
      console.log(`\n👥 HÓSPEDES:`);
      console.log(`   Buscados: ${stats.guests.fetched}`);
      console.log(`   Criados: ${stats.guests.created}`);
      console.log(`   Atualizados: ${stats.guests.updated}`);
      console.log(`   Falharam: ${stats.guests.failed}`);
      
      console.log(`\n🏠 PROPRIEDADES:`);
      console.log(`   Buscadas: ${stats.properties.fetched}`);
      console.log(`   Criadas: ${stats.properties.created}`);
      console.log(`   Atualizadas: ${stats.properties.updated}`);
      console.log(`   Falharam: ${stats.properties.failed}`);
      
      console.log(`\n📅 RESERVAS:`);
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
      
      // 5. Buscar dados sincronizados
      console.log('\n⏳ Aguardando 2 segundos para dados serem salvos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const dados = await buscarDadosSincronizados(token);
      
      // 6. Exibir dados na tela
      exibirDados(dados);
      
    } else {
      console.log('❌ Sincronização concluída com erros');
      console.log('\n📊 Estatísticas:');
      console.log(JSON.stringify(resultado.data.stats, null, 2));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 Processo concluído!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

