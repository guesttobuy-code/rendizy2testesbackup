-- =====================================================
-- MIGRATION: Corretores Solo vs Vinculado
-- Data: 2026-02-02
-- =====================================================

-- 1. Adicionar colunas novas em re_brokers
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS broker_type TEXT DEFAULT 'solo';
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS linked_company_id UUID REFERENCES re_companies(id);
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS link_type TEXT;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT 'active';
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_see_chat": true, "can_see_campaigns": true, "can_see_ranking": false, "can_receive_leads": true, "can_make_reservations": false}';
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS commission_split JSONB DEFAULT '{"broker": 70, "company": 30}';
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
ALTER TABLE re_brokers ADD COLUMN IF NOT EXISTS total_volume DECIMAL(15,2) DEFAULT 0;

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_re_brokers_type ON re_brokers(broker_type);
CREATE INDEX IF NOT EXISTS idx_re_brokers_linked_company ON re_brokers(linked_company_id);
CREATE INDEX IF NOT EXISTS idx_re_brokers_creci ON re_brokers(creci);

-- 3. Tabela de convites pendentes
CREATE TABLE IF NOT EXISTS re_broker_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES re_companies(id) ON DELETE CASCADE,
  broker_email TEXT,
  broker_creci TEXT,
  link_type TEXT NOT NULL CHECK (link_type IN ('employee', 'associate', 'guest')),
  permissions JSONB DEFAULT '{"can_see_chat": true, "can_see_campaigns": true, "can_see_ranking": false, "can_receive_leads": true, "can_make_reservations": false}',
  commission_split JSONB DEFAULT '{"broker": 70, "company": 30}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_broker_invites_company ON re_broker_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_invites_email ON re_broker_invites(broker_email);
CREATE INDEX IF NOT EXISTS idx_re_broker_invites_status ON re_broker_invites(status);

-- 4. Chat interno da imobiliária - Canais
CREATE TABLE IF NOT EXISTS re_broker_chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES re_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'group' CHECK (type IN ('group', 'direct', 'announcement')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_broker_chat_channels_company ON re_broker_chat_channels(company_id);

-- 5. Chat interno - Mensagens
CREATE TABLE IF NOT EXISTS re_broker_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES re_broker_chat_channels(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES re_brokers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_broker_chat_messages_channel ON re_broker_chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_chat_messages_broker ON re_broker_chat_messages(broker_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_chat_messages_created ON re_broker_chat_messages(created_at DESC);

-- 6. Campanhas internas
CREATE TABLE IF NOT EXISTS re_broker_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES re_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('training', 'plantation', 'goal', 'announcement', 'promotion')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_brokers UUID[] DEFAULT NULL, -- NULL = todos os corretores
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_broker_campaigns_company ON re_broker_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_campaigns_status ON re_broker_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_re_broker_campaigns_dates ON re_broker_campaigns(start_date, end_date);

-- 7. Participação em campanhas (tracking)
CREATE TABLE IF NOT EXISTS re_broker_campaign_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES re_broker_campaigns(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES re_brokers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'confirmed', 'completed', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, broker_id)
);

CREATE INDEX IF NOT EXISTS idx_re_broker_campaign_part_campaign ON re_broker_campaign_participation(campaign_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_campaign_part_broker ON re_broker_campaign_participation(broker_id);

-- 8. Ranking/Metas
CREATE TABLE IF NOT EXISTS re_broker_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES re_companies(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES re_brokers(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales INTEGER DEFAULT 0,
  total_volume DECIMAL(15,2) DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  rank_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, broker_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_re_broker_rankings_company ON re_broker_rankings(company_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_rankings_broker ON re_broker_rankings(broker_id);
CREATE INDEX IF NOT EXISTS idx_re_broker_rankings_period ON re_broker_rankings(period_type, period_start);

-- 9. RLS Policies
ALTER TABLE re_broker_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_broker_chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_broker_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_broker_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_broker_campaign_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_broker_rankings ENABLE ROW LEVEL SECURITY;

-- Policies para convites (empresa pode gerenciar seus convites)
DROP POLICY IF EXISTS "re_broker_invites_select" ON re_broker_invites;
CREATE POLICY "re_broker_invites_select" ON re_broker_invites
  FOR SELECT USING (
    company_id IN (SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    OR broker_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "re_broker_invites_insert" ON re_broker_invites;
CREATE POLICY "re_broker_invites_insert" ON re_broker_invites
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "re_broker_invites_update" ON re_broker_invites;
CREATE POLICY "re_broker_invites_update" ON re_broker_invites
  FOR UPDATE USING (
    company_id IN (SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    OR broker_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policies para chat channels (empresa pode gerenciar, corretores vinculados podem ver)
DROP POLICY IF EXISTS "re_broker_chat_channels_select" ON re_broker_chat_channels;
CREATE POLICY "re_broker_chat_channels_select" ON re_broker_chat_channels
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      UNION
      SELECT linked_company_id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND broker_type = 'linked' AND (permissions->>'can_see_chat')::boolean = true
    )
  );

DROP POLICY IF EXISTS "re_broker_chat_channels_insert" ON re_broker_chat_channels;
CREATE POLICY "re_broker_chat_channels_insert" ON re_broker_chat_channels
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

-- Policies para mensagens (quem pode ver o canal pode ver mensagens)
DROP POLICY IF EXISTS "re_broker_chat_messages_select" ON re_broker_chat_messages;
CREATE POLICY "re_broker_chat_messages_select" ON re_broker_chat_messages
  FOR SELECT USING (
    channel_id IN (SELECT id FROM re_broker_chat_channels WHERE company_id IN (
      SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      UNION
      SELECT linked_company_id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND broker_type = 'linked' AND (permissions->>'can_see_chat')::boolean = true
    ))
  );

DROP POLICY IF EXISTS "re_broker_chat_messages_insert" ON re_broker_chat_messages;
CREATE POLICY "re_broker_chat_messages_insert" ON re_broker_chat_messages
  FOR INSERT WITH CHECK (
    broker_id IN (SELECT id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

-- Policies para campanhas
DROP POLICY IF EXISTS "re_broker_campaigns_select" ON re_broker_campaigns;
CREATE POLICY "re_broker_campaigns_select" ON re_broker_campaigns
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      UNION
      SELECT linked_company_id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND broker_type = 'linked' AND (permissions->>'can_see_campaigns')::boolean = true
    )
  );

DROP POLICY IF EXISTS "re_broker_campaigns_insert" ON re_broker_campaigns;
CREATE POLICY "re_broker_campaigns_insert" ON re_broker_campaigns
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

-- Policies para rankings
DROP POLICY IF EXISTS "re_broker_rankings_select" ON re_broker_rankings;
CREATE POLICY "re_broker_rankings_select" ON re_broker_rankings
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM re_companies WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
      UNION
      SELECT linked_company_id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND broker_type = 'linked' AND (permissions->>'can_see_ranking')::boolean = true
    )
    OR broker_id IN (SELECT id FROM re_brokers WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  );

-- 10. Migrar dados existentes (vinculo -> broker_type)
UPDATE re_brokers 
SET broker_type = CASE 
  WHEN vinculo = 'autonomo' THEN 'solo'
  WHEN vinculo = 'vinculado' THEN 'linked'
  ELSE 'solo'
END
WHERE broker_type IS NULL OR broker_type = 'solo';

-- 11. Criar canais padrão para imobiliárias existentes
INSERT INTO re_broker_chat_channels (company_id, name, description, type)
SELECT 
  id,
  '#geral',
  'Canal geral da equipe',
  'group'
FROM re_companies 
WHERE type = 'real_estate_agency'
AND NOT EXISTS (
  SELECT 1 FROM re_broker_chat_channels WHERE re_broker_chat_channels.company_id = re_companies.id
);
