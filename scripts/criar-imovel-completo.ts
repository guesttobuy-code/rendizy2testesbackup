/**
 * Script para criar um imóvel completo via API
 * 
 * Uso: Execute este script após fazer login no sistema
 * 
 * Este script cria um imóvel completo com todos os campos preenchidos
 * para testar o sistema de criação de propriedades.
 */

interface PropertyData {
  name: string;
  code: string;
  type: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    stateCode: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  currency: string;
  propertyType: 'individual' | 'location-linked';
  accommodationType?: string;
  subtype?: string;
  modalities?: string[];
  financialInfo?: any;
  description?: string;
  [key: string]: any;
}

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const PUBLIC_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !PUBLIC_ANON_KEY) {
  throw new Error('Variáveis ausentes: defina SUPABASE_URL e SUPABASE_ANON_KEY (ou VITE_*) no ambiente');
}

const BACKEND_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server/make-server-67caf26a`;

/**
 * Criar imóvel completo
 */
async function criarImovelCompleto(token: string): Promise<void> {
  const imovelData: PropertyData = {
    name: 'Casa de Teste Completa',
    code: `TEST${Date.now().toString(36).toUpperCase()}`,
    type: 'loc_casa',
    propertyType: 'individual',
    accommodationType: 'acc_casa',
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
      coordinates: {
        lat: -23.0065,
        lng: -43.4728
      }
    },
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    basePrice: 500,
    currency: 'BRL',
    minNights: 2,
    financialInfo: {
      monthlyRent: 3000,
      iptu: 200,
      condo: 400,
      fees: 0,
      salePrice: 800000,
      iptuAnnual: 2400
    },
    description: 'Casa completa de teste criada automaticamente para validação do sistema.',
    tags: ['teste', 'automático'],
    amenities: ['wifi', 'parking', 'pool'],
    // Estrutura wizard (compatibilidade)
    contentType: {
      propertyTypeId: 'loc_casa',
      accommodationTypeId: 'acc_casa',
      subtipo: 'entire_place',
      modalidades: ['short_term_rental', 'buy_sell', 'residential_rental'],
      propertyType: 'individual',
      financialData: {
        monthlyRent: 3000,
        iptu: 200,
        condo: 400,
        fees: 0,
        salePrice: 800000,
        iptuAnnual: 2400
      }
    },
    contentLocation: {
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
        coordinates: {
          lat: -23.0065,
          lng: -43.4728
        }
      }
    },
    contentRooms: {
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2
    }
  };

  try {
    console.log('🏗️ Criando imóvel completo...');
    console.log('📊 Dados:', JSON.stringify(imovelData, null, 2));

    const response = await fetch(`${BACKEND_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': PUBLIC_ANON_KEY
      },
      body: JSON.stringify(imovelData)
    });

    const responseText = await response.text();
    console.log('📡 Status:', response.status);
    console.log('📡 Resposta:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      if (data.success) {
        console.log('✅ Imóvel criado com sucesso!');
        console.log('📋 ID:', data.data?.id);
        console.log('📋 Código:', data.data?.code);
        console.log('📋 Nome:', data.data?.name);
        return;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Erro ao criar imóvel:', error);
    throw error;
  }
}

// Para usar no console do navegador:
// 1. Faça login no sistema
// 2. Abra o console (F12)
// 3. Copie e cole este código:
/*
const token = localStorage.getItem('rendizy-token');
if (!token) {
  console.error('❌ Token não encontrado. Faça login primeiro.');
} else {
  criarImovelCompleto(token).then(() => {
    console.log('✅ Imóvel criado! Verifique na listagem.');
  }).catch(err => {
    console.error('❌ Erro:', err);
  });
}
*/

export { criarImovelCompleto };

