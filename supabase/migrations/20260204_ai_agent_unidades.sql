-- =============================================================================
-- MIGRATION: ai_agent_unidades
-- Criado: 04/02/2026
-- Descrição: Tabela para armazenar unidades individuais de cada empreendimento
-- =============================================================================

-- Tabela de unidades (apartamentos, salas, lojas, etc)
CREATE TABLE IF NOT EXISTS public.ai_agent_unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos
    empreendimento_id UUID REFERENCES public.ai_agent_empreendimentos(id) ON DELETE CASCADE,
    construtora_id UUID REFERENCES public.ai_agent_construtoras(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identificação da unidade
    codigo VARCHAR(50) NOT NULL,           -- Ex: "1301", "Apt 502", "Sala 101"
    bloco VARCHAR(50),                     -- Ex: "Bloco 1", "Torre A"
    andar INTEGER,                         -- Número do andar
    
    -- Tipologia
    tipologia VARCHAR(50),                 -- Ex: "1Q", "2Q", "3Q", "DS", "COB", "GARDEN"
    tipologia_descricao VARCHAR(200),      -- Ex: "1 Quarto", "Duplex", "Cobertura"
    
    -- Características
    area_privativa DECIMAL(10, 2),         -- m²
    area_total DECIMAL(10, 2),             -- m²
    quartos INTEGER,
    suites INTEGER,
    vagas INTEGER,
    
    -- Comercial
    status VARCHAR(50) DEFAULT 'disponivel', -- disponivel, reservado, vendido, indisponivel
    preco DECIMAL(15, 2),                    -- Preço atual
    preco_m2 DECIMAL(10, 2),                 -- Preço por m²
    
    -- Vendedor/Imobiliária
    imobiliaria VARCHAR(200),              -- Quem vendeu ou tem a unidade
    corretor VARCHAR(200),
    
    -- Datas
    data_venda DATE,                       -- Quando foi vendida
    data_reserva DATE,                     -- Quando foi reservada
    
    -- Metadados
    dados_raw JSONB,                       -- Dados brutos do scraping
    fonte VARCHAR(200),                    -- URL de onde veio
    
    -- Timestamps
    scraped_at TIMESTAMPTZ DEFAULT NOW(), -- Quando foi extraído
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint única: não duplicar mesma unidade no mesmo empreendimento
    UNIQUE(empreendimento_id, codigo, bloco)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_empreendimento 
    ON public.ai_agent_unidades(empreendimento_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_construtora 
    ON public.ai_agent_unidades(construtora_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_organization 
    ON public.ai_agent_unidades(organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_status 
    ON public.ai_agent_unidades(status);

CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_tipologia 
    ON public.ai_agent_unidades(tipologia);

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_ai_agent_unidades_codigo 
    ON public.ai_agent_unidades(codigo);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_agent_unidades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_agent_unidades_updated_at ON public.ai_agent_unidades;
CREATE TRIGGER trigger_ai_agent_unidades_updated_at
    BEFORE UPDATE ON public.ai_agent_unidades
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_agent_unidades_updated_at();

-- RLS (Row Level Security)
ALTER TABLE public.ai_agent_unidades ENABLE ROW LEVEL SECURITY;

-- Política: Usuários veem apenas unidades da sua organização
-- Usando auth.jwt() para pegar organization_id do token
CREATE POLICY ai_agent_unidades_org_policy ON public.ai_agent_unidades
    FOR ALL
    USING (
        organization_id = (auth.jwt() ->> 'organization_id')::uuid
        OR organization_id = '00000000-0000-0000-0000-000000000000'::uuid
    );

-- Permitir service_role acesso total
CREATE POLICY ai_agent_unidades_service_policy ON public.ai_agent_unidades
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.ai_agent_unidades IS 'Unidades individuais de empreendimentos (apartamentos, salas, etc)';
COMMENT ON COLUMN public.ai_agent_unidades.codigo IS 'Código único da unidade dentro do empreendimento';
COMMENT ON COLUMN public.ai_agent_unidades.tipologia IS 'Tipo da unidade: 1Q, 2Q, DS, COB, etc';
COMMENT ON COLUMN public.ai_agent_unidades.status IS 'Status: disponivel, reservado, vendido, indisponivel';
COMMENT ON COLUMN public.ai_agent_unidades.imobiliaria IS 'Imobiliária responsável pela venda';

-- =============================================================================
-- VIEW: Resumo de disponibilidade por empreendimento
-- =============================================================================
CREATE OR REPLACE VIEW public.v_ai_agent_disponibilidade AS
SELECT 
    e.id AS empreendimento_id,
    e.nome AS empreendimento,
    c.name AS construtora,
    e.organization_id,
    COUNT(*) AS total_unidades,
    COUNT(*) FILTER (WHERE u.status = 'disponivel') AS disponiveis,
    COUNT(*) FILTER (WHERE u.status = 'reservado') AS reservadas,
    COUNT(*) FILTER (WHERE u.status = 'vendido') AS vendidas,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE u.status = 'vendido') / NULLIF(COUNT(*), 0),
        2
    ) AS percentual_vendido,
    MAX(u.scraped_at) AS ultima_atualizacao
FROM public.ai_agent_empreendimentos e
LEFT JOIN public.ai_agent_unidades u ON u.empreendimento_id = e.id
LEFT JOIN public.ai_agent_construtoras c ON c.id = e.construtora_id
GROUP BY e.id, e.nome, c.name, e.organization_id;

COMMENT ON VIEW public.v_ai_agent_disponibilidade IS 'Resumo de disponibilidade por empreendimento';
