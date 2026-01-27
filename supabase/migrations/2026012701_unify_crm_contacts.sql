-- ============================================================================
-- MIGRATION: Unificação crm_contacts (guests + owners + contacts)
-- Data: 2026-01-27
-- Descrição: Expandir crm_contacts para ser a única fonte de verdade
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR CAMPOS DE HÓSPEDE (guest)
-- ============================================================================

-- Documentos
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS passport VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS rg VARCHAR(30);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);

-- Endereço completo (expandir)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100);

-- Dados pessoais
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pt-BR';

-- Estatísticas de hóspede
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS stats_total_reservations INTEGER DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS stats_total_nights INTEGER DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS stats_total_spent NUMERIC(12,2) DEFAULT 0;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS stats_average_rating NUMERIC(3,2);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS stats_last_stay_date TIMESTAMPTZ;

-- Preferências de hóspede (JSON)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Blacklist
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS blacklisted_by UUID;

-- Vínculo StaysNet
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS staysnet_client_id VARCHAR(100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS staysnet_raw JSONB;

-- Tags
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. ADICIONAR CAMPOS DE PROPRIETÁRIO (owner)
-- ============================================================================

-- Tipo de contrato
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'active';

-- Dados bancários (JSON)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS bank_data JSONB DEFAULT '{}';

-- Comissões
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS taxa_comissao NUMERIC(5,2);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS forma_pagamento_comissao VARCHAR(50);

-- Premium
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Dados profissionais
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS profissao VARCHAR(100);
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS renda_mensal NUMERIC(12,2);

-- ============================================================================
-- 3. ATUALIZAR CONSTRAINT DE contact_type
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_type_check;
ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_contact_type_check;

-- Nova constraint com todos os tipos
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_contact_type_check 
CHECK (contact_type IS NULL OR contact_type IN (
  'guest',        -- Hóspede (vem de reserva)
  'lead',         -- Lead/Interessado
  'cliente',      -- Cliente ativo
  'ex-cliente',   -- Ex-cliente
  'proprietario', -- Proprietário de imóvel
  'parceiro',     -- Parceiro comercial/corretor
  'fornecedor',   -- Fornecedor
  'outro'         -- Outros
));

-- Constraint de contract_type (para proprietários)
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_contract_type_check 
CHECK (contract_type IS NULL OR contract_type IN (
  'exclusivity',   -- Exclusividade
  'non_exclusive', -- Não exclusivo
  'temporary'      -- Temporário
));

-- ============================================================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_crm_contacts_contact_type ON crm_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_cpf ON crm_contacts(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_staysnet_client_id ON crm_contacts(staysnet_client_id) WHERE staysnet_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_is_blacklisted ON crm_contacts(is_blacklisted) WHERE is_blacklisted = true;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_contract_type ON crm_contacts(contract_type) WHERE contract_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_is_premium ON crm_contacts(is_premium) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tags ON crm_contacts USING GIN(tags) WHERE tags != '{}';

-- ============================================================================
-- 5. ADICIONAR COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN crm_contacts.contact_type IS 'Tipo do contato: guest, lead, cliente, ex-cliente, proprietario, parceiro, fornecedor, outro';
COMMENT ON COLUMN crm_contacts.is_type_locked IS 'Se true, tipo não pode ser alterado pelo usuário (ex: guest importado)';
COMMENT ON COLUMN crm_contacts.cpf IS 'CPF do contato (para guests e proprietários brasileiros)';
COMMENT ON COLUMN crm_contacts.passport IS 'Passaporte (para guests estrangeiros)';
COMMENT ON COLUMN crm_contacts.staysnet_client_id IS 'ID do cliente na StaysNet (para dedupe de importação)';
COMMENT ON COLUMN crm_contacts.preferences IS 'Preferências do hóspede: {early_check_in, late_check_out, quiet_floor, high_floor, pets}';
COMMENT ON COLUMN crm_contacts.bank_data IS 'Dados bancários: {banco, agencia, conta, tipo_conta, chave_pix}';
COMMENT ON COLUMN crm_contacts.contract_type IS 'Tipo de contrato (proprietário): exclusivity, non_exclusive, temporary';

-- ============================================================================
-- 6. CRIAR FK DE RESERVATIONS PARA CRM_CONTACTS (OPCIONAL)
-- ============================================================================

-- Adicionar coluna para novo vínculo (mantendo guest_id por compatibilidade)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS crm_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_crm_contact_id ON reservations(crm_contact_id) WHERE crm_contact_id IS NOT NULL;

COMMENT ON COLUMN reservations.crm_contact_id IS 'Vínculo com crm_contacts (novo). guest_id mantido para compatibilidade.';

-- ============================================================================
-- 7. VIEW PARA LISTAR CONTATOS POR TIPO
-- ============================================================================

CREATE OR REPLACE VIEW crm_contacts_summary AS
SELECT 
  organization_id,
  contact_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_blacklisted = true) as blacklisted,
  COUNT(*) FILTER (WHERE is_premium = true) as premium
FROM crm_contacts
GROUP BY organization_id, contact_type;

-- ============================================================================
-- PRONTO! Migration aplicada com sucesso.
-- ============================================================================
