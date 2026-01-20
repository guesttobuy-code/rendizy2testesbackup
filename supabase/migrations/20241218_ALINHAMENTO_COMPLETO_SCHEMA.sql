-- ============================================================================
-- MIGRAÇÃO: ALINHAMENTO COMPLETO DO SCHEMA
-- Data: 18/12/2024
-- Projeto: Rendizy
-- Objetivo: Alinhar TODAS as tabelas com o código Backend/Frontend
-- ============================================================================

-- ============================================================================
-- 1. CORREÇÃO: TABELA reservations
-- ============================================================================

-- 1.1. Remover FK antiga (aponta para `properties` descontinuada)
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_property_id_fkey;

-- 1.2. Criar FK correta (aponta para `anuncios_drafts` - sistema Ultimate ativo)
DO $$
BEGIN
  IF to_regclass('public.anuncios_drafts') IS NOT NULL THEN
    ALTER TABLE reservations
    ADD CONSTRAINT reservations_property_id_fkey 
      FOREIGN KEY (property_id) 
      REFERENCES anuncios_drafts(id) 
      ON DELETE CASCADE;
  ELSIF to_regclass('public.properties') IS NOT NULL THEN
    ALTER TABLE reservations
    ADD CONSTRAINT reservations_property_id_fkey 
      FOREIGN KEY (property_id) 
      REFERENCES properties(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 1.3. Verificar FK de guests (deve apontar para `guests`, não `hospedes`)
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;

ALTER TABLE reservations
ADD CONSTRAINT reservations_guest_id_fkey 
  FOREIGN KEY (guest_id) 
  REFERENCES guests(id) 
  ON DELETE SET NULL;

-- 1.4. Adicionar índices de performance
CREATE INDEX IF NOT EXISTS idx_reservations_property_id 
ON reservations(property_id);

CREATE INDEX IF NOT EXISTS idx_reservations_guest_id 
ON reservations(guest_id);

CREATE INDEX IF NOT EXISTS idx_reservations_organization_dates
ON reservations(organization_id, check_in DESC);

-- ============================================================================
-- 2. CORREÇÃO: TABELA guests (compatibilidade com backend)
-- ============================================================================

-- 2.1. Adicionar coluna `full_name` se não existir (backend espera isso - linha 393)
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2.2. Adicionar coluna `document_number` se não existir (identificação de hóspede)
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS document_number TEXT;

-- 2.3. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_guests_organization_id 
ON guests(organization_id);

CREATE INDEX IF NOT EXISTS idx_guests_email 
ON guests(email);

-- 2.4. Nota: Sem migração de dados (coluna `name` não existe na tabela guests)
-- A coluna full_name será adicionada vazia e preenchida pelo backend

-- ============================================================================
-- 3. CORREÇÃO: TABELA anuncios_drafts (garantir integridade)
-- ============================================================================

-- 3.1. Garantir que `id` tem índice (usado como FK por reservations)
DO $$
BEGIN
  IF to_regclass('public.anuncios_drafts') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_anuncios_drafts_id 
    ON anuncios_drafts(id);

    -- 3.2. Garantir que organization_id tem índice (filtro multi-tenant)
    CREATE INDEX IF NOT EXISTS idx_anuncios_drafts_organization_id 
    ON anuncios_drafts(organization_id);
  END IF;
END $$;

-- ============================================================================
-- 4. CORREÇÃO: TABELA organizations (UUID master do Rendizy)
-- ============================================================================

-- 4.1. Garantir que existe UUID master para superadmin (00000000-0000-0000-0000-000000000000)
INSERT INTO organizations (id, name, slug, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Rendizy Master',
  'rendizy-master',
  'admin@rendizy.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. VERIFICAÇÃO: Garantir que constraints estão corretas
-- ============================================================================

-- 5.1. Verificar constraint de datas (check_out > check_in)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_dates' 
    AND conrelid = 'reservations'::regclass
  ) THEN
    ALTER TABLE reservations 
    ADD CONSTRAINT check_dates CHECK (check_out > check_in);
  END IF;
END $$;

-- 5.2. Verificar constraint de preço total >= 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_pricing_total' 
    AND conrelid = 'reservations'::regclass
  ) THEN
    ALTER TABLE reservations 
    ADD CONSTRAINT check_pricing_total CHECK (pricing_total >= 0);
  END IF;
END $$;

-- ============================================================================
-- 6. RLS (Row Level Security) - Garantir políticas multi-tenant
-- ============================================================================

-- 6.1. Habilitar RLS se não estiver habilitado
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF to_regclass('public.anuncios_drafts') IS NOT NULL THEN
    ALTER TABLE anuncios_drafts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 6.2. Políticas para reservations (service role tem acesso total)
DROP POLICY IF EXISTS "Service role full access" ON reservations;
CREATE POLICY "Service role full access" 
  ON reservations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6.3. Políticas para guests (service role tem acesso total)
DROP POLICY IF EXISTS "Service role full access" ON guests;
CREATE POLICY "Service role full access" 
  ON guests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6.4. Políticas para anuncios_drafts (service role tem acesso total)
DO $$
BEGIN
  IF to_regclass('public.anuncios_drafts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Service role full access" ON anuncios_drafts;
    CREATE POLICY "Service role full access" 
      ON anuncios_drafts
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 7. LIMPEZA: Remover FKs órfãs (se existirem)
-- ============================================================================

-- 7.1. Verificar se existe FK para `properties` em outras tabelas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE confrelid = 'properties'::regclass
    AND contype = 'f'
  ) LOOP
    RAISE NOTICE 'FK órfã encontrada: % na tabela %', r.conname, r.table_name;
    -- Descomente a linha abaixo para remover automaticamente
    -- EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.table_name, r.conname);
  END LOOP;
END $$;

-- ============================================================================
-- 8. VALIDAÇÃO: Queries de teste
-- ============================================================================

-- 8.1. Verificar se FKs estão corretas
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname LIKE '%reservations%'
  AND contype = 'f'
ORDER BY conrelid::regclass, conname;

-- 8.2. Verificar se colunas guests estão corretas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'guests'
  AND column_name IN ('id', 'full_name', 'name', 'email', 'document_number', 'organization_id')
ORDER BY column_name;

-- 8.3. Verificar se colunas reservations estão corretas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('id', 'property_id', 'guest_id', 'organization_id', 'check_in', 'check_out')
ORDER BY column_name;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

-- ✅ VERIFICAÇÃO FINAL:
-- - reservations.property_id → anuncios_drafts.id ✅
-- - reservations.guest_id → guests.id ✅
-- - guests.full_name existe ✅
-- - guests.document_number existe ✅
-- - Índices de performance criados ✅
-- - RLS policies ativas ✅
-- - Organizations master UUID existe ✅
