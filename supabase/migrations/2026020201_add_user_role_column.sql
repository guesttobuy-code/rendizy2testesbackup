-- ============================================================================
-- MIGRATION: Adicionar coluna 'role' para permissões granulares
-- Data: 2026-02-02
-- Descrição: Adiciona role (owner/admin/manager/staff/readonly) separado de type
-- ============================================================================

-- 1. Adicionar coluna role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT 
  DEFAULT 'staff' 
  CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'readonly'));

-- 2. Adicionar coluna email_verified
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 3. Adicionar coluna invited_by (quem convidou este usuário)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Migrar dados existentes: type='imobiliaria' → role='owner'
UPDATE users SET role = 'owner' WHERE type = 'imobiliaria' AND role IS NULL;
UPDATE users SET role = 'owner' WHERE type = 'superadmin' AND role IS NULL;
UPDATE users SET role = 'staff' WHERE type = 'staff' AND role IS NULL;

-- 5. Criar índice para buscas por role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 6. Adicionar campos na tabela organizations para self-signup
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'admin'
  CHECK (signup_source IN ('admin', 'self_signup', 'referral', 'api'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 7. Log da migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 2026020201 executada com sucesso: coluna role adicionada';
END $$;
