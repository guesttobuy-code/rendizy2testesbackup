-- Migration: Adicionar suporte a múltiplos provedores de hospedagem
-- Data: 13/01/2026
-- Descrição: Cada site pode ter sua própria configuração de hospedagem (Vercel, Netlify, etc.)

-- Adicionar colunas de hospedagem na tabela client_sites
ALTER TABLE client_sites 
ADD COLUMN IF NOT EXISTS hosting_providers JSONB NOT NULL DEFAULT '{}';

-- Estrutura esperada do hosting_providers:
-- {
--   "active_provider": "vercel",  -- qual provedor está ativo
--   "vercel": {
--     "access_token": "xxxxx",     -- token de acesso da conta do cliente
--     "team_id": "team_xxx",       -- ID do time (opcional)
--     "project_id": "prj_xxx",     -- ID do projeto na Vercel
--     "project_name": "medhome",   -- nome do projeto
--     "domain": "medhome.vercel.app", -- domínio atribuído
--     "last_deployment_id": "dpl_xxx",
--     "last_deployment_url": "https://...",
--     "last_deployment_status": "READY",
--     "last_deployment_at": "2026-01-13T...",
--     "use_global_token": false    -- se true, usa token global do sistema
--   },
--   "netlify": {
--     "access_token": "xxxxx",
--     "site_id": "xxx",
--     "site_name": "medhome",
--     "domain": "medhome.netlify.app",
--     "use_global_token": false
--   },
--   "cloudflare_pages": {
--     "api_token": "xxxxx",
--     "account_id": "xxx",
--     "project_name": "medhome"
--   }
-- }

COMMENT ON COLUMN client_sites.hosting_providers IS 'Configurações de provedores de hospedagem (Vercel, Netlify, Cloudflare Pages, etc.)';

-- Índice para busca por provedor ativo
CREATE INDEX IF NOT EXISTS idx_client_sites_active_provider 
ON client_sites USING gin ((hosting_providers->'active_provider'));

-- Função para extrair token de um provedor específico (helper para Edge Functions)
CREATE OR REPLACE FUNCTION get_hosting_provider_token(site_id UUID, provider TEXT)
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  SELECT hosting_providers->provider->>'access_token'
  INTO token
  FROM client_sites
  WHERE id = site_id;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar coluna para status de hospedagem separado (para manter compatibilidade)
-- Migrar dados existentes das colunas vercel_* para o novo formato JSONB
DO $$
BEGIN
  -- Migrar dados existentes se as colunas antigas existirem
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_sites' AND column_name = 'vercel_deployment_id'
  ) THEN
    UPDATE client_sites
    SET hosting_providers = jsonb_build_object(
      'active_provider', 'vercel',
      'vercel', jsonb_build_object(
        'use_global_token', true,
        'project_id', vercel_deployment_id,
        'domain', vercel_deployment_url,
        'last_deployment_id', vercel_deployment_id,
        'last_deployment_url', vercel_deployment_url,
        'last_deployment_status', COALESCE(vercel_deployment_status, 'NONE')
      )
    )
    WHERE vercel_deployment_id IS NOT NULL
      AND (hosting_providers IS NULL OR hosting_providers = '{}'::jsonb);
  END IF;
END $$;

-- Log da migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260113_add_hosting_providers completed successfully';
END $$;
