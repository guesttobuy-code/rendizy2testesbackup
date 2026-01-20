
-- ============================================================================
-- Tabelas mínimas auxiliares para evitar falha de dependência em resets locais
-- ============================================================================
-- Em produção essas tabelas são fornecidas por outros módulos. Para que o
-- reset local funcione sem erros de referência cruzada, criamos versões
-- mínimas apenas com a coluna id.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE TABLE IF NOT EXISTS service_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

CREATE TABLE IF NOT EXISTS service_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 1. SISTEMA DE PAGAMENTOS
-- ============================================================================

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Tipo de transação
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'payout', 'refund', 'commission', 'bonus')),
    
    -- Valor
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
    
    -- Relacionamento (opcional)
    service_id UUID REFERENCES service_listings(id),
    proposal_id UUID REFERENCES service_proposals(id),
    request_id UUID REFERENCES service_requests(id),
    
    -- Método de pagamento
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer', 'wallet'
    payment_reference TEXT, -- ID da transação externa
    
    -- Informações adicionais
    description TEXT,
    metadata JSONB,
    
    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Tabela de Carteiras (Wallet)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Saldos
    balance DECIMAL(10, 2) DEFAULT 0 CHECK (balance >= 0),
    pending_balance DECIMAL(10, 2) DEFAULT 0 CHECK (pending_balance >= 0),
    total_earnings DECIMAL(10, 2) DEFAULT 0 CHECK (total_earnings >= 0),
    
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Configurações de saque
    payout_enabled BOOLEAN DEFAULT false,
    payout_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer'
    payout_account TEXT, -- Dados da conta (mascarados)
    
    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);

-- Função utilitária para atualizar updated_at (garante existência)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. SISTEMA DE BADGES/CONQUISTAS
-- ============================================================================

-- Tabela de Badges Disponíveis
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informações
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    category VARCHAR(50), -- 'achievement', 'verification', 'social', 'service'
    
    -- Requisitos
    requirements JSONB, -- Critérios para ganhar o badge
    
    -- Ordem e prioridade
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Badges dos Usuários
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    
    -- Quando foi conquistado
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Se está destacado no perfil
    is_featured BOOLEAN DEFAULT false,
    
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned ON user_badges(earned_at DESC);

-- ============================================================================
-- 3. SISTEMA DE MODERAÇÃO
-- ============================================================================

-- Tabela de Denúncias
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Quem denunciou
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- O que foi denunciado
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('post', 'service', 'user', 'comment', 'group', 'message')),
    reported_id UUID NOT NULL, -- ID do item denunciado
    
    -- Motivo
    reason VARCHAR(100) NOT NULL, -- 'spam', 'harassment', 'fake', 'inappropriate', 'other'
    description TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed', 'escalated')),
    
    -- Ação tomada
    action_taken VARCHAR(100), -- 'warned', 'removed', 'banned', 'no_action'
    action_notes TEXT,
    
    -- Quem moderou
    moderated_by UUID REFERENCES profiles(id),
    moderated_at TIMESTAMPTZ,
    
    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_type ON reports(report_type, reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Tabela de Ações de Moderação
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Item moderado
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('post', 'service', 'user', 'comment', 'group', 'message')),
    target_id UUID NOT NULL,
    
    -- Ação
    action VARCHAR(50) NOT NULL, -- 'warn', 'hide', 'remove', 'ban', 'suspend'
    reason TEXT,
    duration_days INTEGER, -- Para suspensões temporárias
    
    -- Quem moderou
    moderator_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Relacionamento com denúncia
    report_id UUID REFERENCES reports(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'reversed', 'expired')),
    
    -- Datas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_status ON moderation_actions(status);
CREATE INDEX idx_moderation_actions_created ON moderation_actions(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
CREATE POLICY "Users can update own wallet" ON wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Badges (públicos)
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active badges" ON badges;
CREATE POLICY "Anyone can view active badges" ON badges
    FOR SELECT USING (is_active = true);

-- User Badges (públicos)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user badges" ON user_badges;
CREATE POLICY "Anyone can view user badges" ON user_badges
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own badges" ON user_badges;
CREATE POLICY "Users can manage own badges" ON user_badges
    FOR ALL USING (auth.uid() = user_id);

-- Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

-- Moderation Actions (apenas admins)
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage moderation actions" ON moderation_actions;
CREATE POLICY "Admins can manage moderation actions" ON moderation_actions
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

-- ============================================================================
-- 5. FUNÇÕES RPC
-- ============================================================================

-- Função para criar wallet automaticamente
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar wallet ao criar perfil
DROP TRIGGER IF EXISTS trigger_create_wallet ON profiles;
CREATE TRIGGER trigger_create_wallet
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_user();

-- Função para atualizar saldo da wallet
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.type = 'payment' THEN
            -- Adicionar ao saldo
            UPDATE wallets
            SET balance = balance + NEW.amount,
                total_earnings = total_earnings + NEW.amount,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF NEW.type = 'payout' THEN
            -- Subtrair do saldo
            UPDATE wallets
            SET balance = balance - NEW.amount,
                updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar wallet quando transação é completada
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON transactions;
CREATE TRIGGER trigger_update_wallet_balance
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION update_wallet_balance();
