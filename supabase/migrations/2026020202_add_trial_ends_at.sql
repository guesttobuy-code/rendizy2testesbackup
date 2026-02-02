-- ============================================================================
-- MIGRATION: Adicionar campo trial_ends_at para controle de período de teste
-- Data: 2026-02-02
-- Descrição: Permite controlar o período de trial de 14 dias
-- ============================================================================

-- 1. Adicionar coluna trial_ends_at
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Adicionar coluna plan se não existir (alinhado com types/tenancy.ts)
-- Valores: 'free' | 'trial' | 'basic' | 'professional' | 'enterprise'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'
  CHECK (plan IN ('free', 'trial', 'basic', 'professional', 'enterprise'));

-- 3. Adicionar índice para buscar organizações com trial expirando
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at 
  ON organizations(trial_ends_at) 
  WHERE trial_ends_at IS NOT NULL;

-- 4. Atualizar organizações existentes sem trial_ends_at
-- Define trial de 14 dias a partir de agora para quem não tem
UPDATE organizations 
SET trial_ends_at = NOW() + INTERVAL '14 days'
WHERE trial_ends_at IS NULL 
  AND plan = 'trial';

-- 5. Log da migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 2026020202 executada com sucesso: trial_ends_at adicionado';
END $$;
