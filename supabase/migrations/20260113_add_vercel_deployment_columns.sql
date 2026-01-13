-- Migration: Adicionar colunas para Vercel Deployment
-- Data: 13/01/2026
-- Descrição: Suporte para build automático de sites via Vercel API

-- Adicionar colunas de deployment
ALTER TABLE client_sites 
ADD COLUMN IF NOT EXISTS vercel_deployment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS vercel_deployment_url TEXT,
ADD COLUMN IF NOT EXISTS vercel_deployment_status VARCHAR(50) DEFAULT 'NONE';

-- Comentários
COMMENT ON COLUMN client_sites.vercel_deployment_id IS 'ID do último deployment na Vercel';
COMMENT ON COLUMN client_sites.vercel_deployment_url IS 'URL do site deployado na Vercel';
COMMENT ON COLUMN client_sites.vercel_deployment_status IS 'Status: NONE, QUEUED, BUILDING, READY, ERROR, CANCELED';

-- Índice para busca por deployment
CREATE INDEX IF NOT EXISTS idx_client_sites_vercel_deployment 
ON client_sites(vercel_deployment_id) 
WHERE vercel_deployment_id IS NOT NULL;
