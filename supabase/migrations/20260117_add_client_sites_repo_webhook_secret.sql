-- Migration: Add repo webhook secret to client_sites
-- Data: 2026-01-17
-- Descrição: Armazenar secret do webhook GitHub por site

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS repo_webhook_secret TEXT;

COMMENT ON COLUMN client_sites.repo_webhook_secret IS 'Secret do webhook GitHub (por site)';
