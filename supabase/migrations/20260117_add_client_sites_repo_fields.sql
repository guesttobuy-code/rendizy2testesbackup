-- Migration: Add repository/deploy fields to client_sites
-- Data: 2026-01-17
-- Descrição: Suporte a sites por repositório (GitHub/Vercel deploy hook)

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS repo_provider TEXT DEFAULT 'github',
  ADD COLUMN IF NOT EXISTS repo_url TEXT,
  ADD COLUMN IF NOT EXISTS repo_branch TEXT DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS repo_deploy_hook_url TEXT,
  ADD COLUMN IF NOT EXISTS repo_vercel_project_url TEXT,
  ADD COLUMN IF NOT EXISTS repo_last_deploy_status TEXT,
  ADD COLUMN IF NOT EXISTS repo_last_deploy_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS repo_last_deploy_error TEXT;

COMMENT ON COLUMN client_sites.repo_provider IS 'Provedor do repositório (github, gitlab, bitbucket)';
COMMENT ON COLUMN client_sites.repo_url IS 'URL do repositório do site';
COMMENT ON COLUMN client_sites.repo_branch IS 'Branch principal do deploy';
COMMENT ON COLUMN client_sites.repo_deploy_hook_url IS 'Deploy Hook da Vercel para disparar deploy';
COMMENT ON COLUMN client_sites.repo_vercel_project_url IS 'URL do projeto na Vercel';
COMMENT ON COLUMN client_sites.repo_last_deploy_status IS 'Status do último deploy via hook';
COMMENT ON COLUMN client_sites.repo_last_deploy_at IS 'Data/hora do último deploy via hook';
COMMENT ON COLUMN client_sites.repo_last_deploy_error IS 'Erro do último deploy via hook';
