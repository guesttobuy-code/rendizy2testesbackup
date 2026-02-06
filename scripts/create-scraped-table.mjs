/**
 * Cria a tabela scraped_properties no Supabase
 * Uso: node scripts/create-scraped-table.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SQL = `
-- Criar tabela scraped_properties
CREATE TABLE IF NOT EXISTS scraped_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT,
  address TEXT,
  price DECIMAL(15,2),
  condominio DECIMAL(10,2),
  iptu DECIMAL(10,2),
  iptu_parcelas INTEGER,
  area_sqm DECIMAL(10,2),
  bedrooms INTEGER,
  suites INTEGER,
  bathrooms INTEGER,
  parking_spots INTEGER,
  living_rooms INTEGER,
  description TEXT,
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  images_base64 JSONB DEFAULT '[]',
  property_type TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  purpose TEXT,
  source TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE scraped_properties ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
DROP POLICY IF EXISTS "scraped_properties_public_read" ON scraped_properties;
CREATE POLICY "scraped_properties_public_read" ON scraped_properties
  FOR SELECT USING (true);

-- Permitir escrita
DROP POLICY IF EXISTS "scraped_properties_write" ON scraped_properties;
CREATE POLICY "scraped_properties_write" ON scraped_properties
  FOR ALL USING (true) WITH CHECK (true);
`;

async function main() {
  console.log('🔧 Criando tabela scraped_properties...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', { query: SQL });
  
  if (error) {
    console.log('ℹ️ RPC exec_sql não disponível, tentando alternativa...');
    
    // Alternativa: inserir um registro de teste para forçar auto-create (não vai funcionar em prod)
    // Vou apenas mostrar o SQL para o usuário executar manualmente
    console.log('\n⚠️ Execute o SQL abaixo no Supabase SQL Editor:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(SQL);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new');
    return;
  }
  
  console.log('✅ Tabela criada com sucesso!');
}

main().catch(console.error);
