/**
 * Script Node.js para criar imóvel completo via API
 * 
 * Uso: node criar-imovel-node.js
 * 
 * Este script faz login, obtém token e cria um imóvel completo
 */

import https from 'https';

const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';
const BASE_URL_AUTH = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/auth`;
const BASE_URL_WITH_MAKE = `https://${PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    // Construir URL completa
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
      }
    };

    // Para login, usar Authorization com anon key
    // Para outras rotas, usar Authorization com anon key + X-Auth-Token com token do usuário
    if (path === '/auth/login') {
      options.headers['Authorization'] = `Bearer ${PUBLIC_ANON_KEY}`;
    } else {
      options.headers['Authorization'] = `Bearer ${PUBLIC_ANON_KEY}`;
      if (token) {
        options.headers['X-Auth-Token'] = token;
      }
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
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
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
  // Login usa URL completa: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/auth/login
  const url = new URL('https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/auth/login');
  const data = JSON.stringify({ username: 'rppt', password: 'root' });
  
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
        console.log('📡 Resposta:', responseData.substring(0, 500));
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200 && parsed.success) {
            console.log('✅ Login realizado com sucesso!');
            resolve(parsed.token);
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

async function criarImovel(token) {
  console.log('🏗️ Criando imóvel completo...');

  const imovelData = {
    name: 'Casa Completa de Teste - Recreio dos Bandeirantes',
    code: `CASA${Date.now().toString(36).toUpperCase()}`,
    type: 'house',
    propertyType: 'individual',
    subtype: 'entire_place',
    modalities: ['short_term_rental', 'buy_sell', 'residential_rental'],
    address: {
      street: 'Rua Lady Laura',
      number: '100',
      complement: 'Casa',
      neighborhood: 'Recreio dos Bandeirantes',
      city: 'Rio de Janeiro',
      state: 'Rio de Janeiro',
      stateCode: 'RJ',
      zipCode: '22790-673',
      country: 'BR',
      coordinates: { lat: -23.0065, lng: -43.4728 }
    },
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    basePrice: 500,
    currency: 'BRL',
    minNights: 2,
    maxNights: 365,
    advanceBooking: 365,
    preparationTime: 1,
    financialInfo: {
      monthlyRent: 3000,
      iptu: 200,
      condo: 400,
      fees: 0,
      salePrice: 800000,
      iptuAnnual: 2400
    },
    description: 'Casa completa de teste criada automaticamente para validação do sistema. Localizada no Recreio dos Bandeirantes, Rio de Janeiro. Casa espaçosa com 3 quartos, 4 camas, 2 banheiros, capacidade para 6 hóspedes. Ideal para temporada, locação ou compra.',
    tags: ['teste', 'automático', 'recreio', 'casa'],
    amenities: ['wifi', 'parking', 'pool', 'air_conditioning', 'tv', 'kitchen', 'washing_machine'],
      // contentType removido - causava erro de UUID no backend
      status: 'active',
      isActive: true
    };

  const response = await makeRequest('/rendizy-server/make-server-67caf26a/properties', 'POST', imovelData, token);

  if (response.status === 200 || response.status === 201) {
    if (response.data.success) {
      console.log('\n✅ ✅ ✅ IMÓVEL CRIADO COM SUCESSO! ✅ ✅ ✅\n');
      console.log('📋 ID:', response.data.data?.id);
      console.log('📋 Código:', response.data.data?.code);
      console.log('📋 Nome:', response.data.data?.name);
      console.log('📋 Tipo:', response.data.data?.type);
      console.log('📋 Endereço:', JSON.stringify(response.data.data?.address, null, 2));
      console.log('📋 Status:', response.data.data?.status);
      console.log('\n🔗 Acesse: https://rendizyoficial.vercel.app/properties');
      return response.data.data;
    } else {
      throw new Error(`Erro ao criar imóvel: ${response.data.error || response.data.message}`);
    }
  } else {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
}

async function main() {
  try {
    const token = await login();
    const imovel = await criarImovel(token);
    console.log('\n✅ Processo concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

