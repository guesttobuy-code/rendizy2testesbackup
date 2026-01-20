-- ============================================================================
-- MIGRAÇÃO: Tabela para Contatos Evolution API (SQL Relacional)
-- Data: 22/11/2025
-- Versão: v1.0.103.1000+
-- ============================================================================
-- 
-- Migra contatos do localStorage para tabela SQL
-- Garante persistência permanente e multi-tenant
-- Segue REGRA_KV_STORE_VS_SQL.md - SQL para dados permanentes
--
-- ============================================================================

-- ============================================================================
-- TABELA: evolution_contacts
-- Armazena contatos do WhatsApp (Evolution API)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evolution_contacts (
  id TEXT PRIMARY KEY, -- ID do WhatsApp (ex: "5511987654321@c.us")
  organization_id TEXT NOT NULL,
  
  -- Dados do contato
  name TEXT NOT NULL,
  phone TEXT NOT NULL, -- Formatted: "+55 11 98765-4321"
  phone_raw TEXT, -- Raw: "5511987654321"
  pushname TEXT, -- Nome do perfil WhatsApp
  
  -- Tipo e status
  is_business BOOLEAN DEFAULT false,
  is_my_contact BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  
  -- Foto de perfil
  profile_pic_url TEXT,
  
  -- Última mensagem e status
  last_message TEXT,
  unread_count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ,
  
  -- Origem
  source TEXT DEFAULT 'evolution' CHECK (source IN ('evolution', 'manual')),
  
  -- Vínculo com sistema Rendizy (opcional)
  linked_guest_id TEXT,
  linked_reservation_id TEXT,
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_contact UNIQUE(organization_id, id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_org ON evolution_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_phone ON evolution_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_name ON evolution_contacts(name);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_source ON evolution_contacts(source);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_updated ON evolution_contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_contacts_unread ON evolution_contacts(organization_id, unread_count) WHERE unread_count > 0;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_evolution_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evolution_contacts_updated_at
  BEFORE UPDATE ON evolution_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_evolution_contacts_updated_at();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE evolution_contacts IS 'Armazena contatos do WhatsApp (Evolution API) - Migrado de localStorage para SQL';
COMMENT ON COLUMN evolution_contacts.id IS 'ID do WhatsApp (ex: "5511987654321@c.us")';
COMMENT ON COLUMN evolution_contacts.organization_id IS 'ID da organização (multi-tenant)';
COMMENT ON COLUMN evolution_contacts.source IS 'Origem do contato: evolution (Evolution API) ou manual';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabela evolution_contacts criada com sucesso!';
  RAISE NOTICE '   - Migração de localStorage para SQL';
  RAISE NOTICE '   - Suporte multi-tenant';
  RAISE NOTICE '   - Índices para performance';
END $$;

