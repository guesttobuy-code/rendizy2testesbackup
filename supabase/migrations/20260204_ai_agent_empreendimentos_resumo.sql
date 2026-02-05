-- =============================================================================
-- MIGRATION: Adicionar campo resumo_vendas em ai_agent_empreendimentos
-- Criado: 04/02/2026
-- =============================================================================

-- Adicionar campo JSONB para resumo de vendas
ALTER TABLE public.ai_agent_empreendimentos 
ADD COLUMN IF NOT EXISTS resumo_vendas JSONB DEFAULT NULL;

COMMENT ON COLUMN public.ai_agent_empreendimentos.resumo_vendas IS 
'Resumo de vendas: {total, disponiveis, reservadas, vendidas, percentual_vendido, atualizado_em}';

-- Exemplo de dados:
-- {
--   "total": 1554,
--   "disponiveis": 14,
--   "reservadas": 2,
--   "vendidas": 1538,
--   "percentual_vendido": 99.03,
--   "atualizado_em": "2026-02-04T19:30:00Z"
-- }
