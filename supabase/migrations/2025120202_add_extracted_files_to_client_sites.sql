-- Migration: Adicionar campos para arquivos extraídos do ZIP
-- Data: 02/12/2025
-- Descrição: Adiciona campos para armazenar URLs públicas dos arquivos extraídos do ZIP para Storage

ALTER TABLE client_sites
  ADD COLUMN IF NOT EXISTS extracted_base_url TEXT,
  ADD COLUMN IF NOT EXISTS extracted_files_count INTEGER;

-- Comentários
COMMENT ON COLUMN client_sites.extracted_base_url IS 'Base URL pública do Storage para arquivos extraídos (ex: https://...supabase.co/storage/v1/object/public/client-sites)';
COMMENT ON COLUMN client_sites.extracted_files_count IS 'Quantidade de arquivos extraídos do ZIP e salvos no Storage';

