-- Migration: Adicionar campo avatar_url na tabela users
-- Data: 2026-01-25
-- Descrição: Permite que usuários tenham foto de perfil personalizada

-- Adicionar coluna avatar_url na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário na coluna
COMMENT ON COLUMN users.avatar_url IS 'URL da foto de perfil do usuário (armazenada no Supabase Storage)';

-- Criar bucket de storage para avatares (se não existir)
-- NOTA: Execute via Dashboard do Supabase ou via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Policy para permitir upload de avatar (se usando storage)
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy para permitir leitura pública de avatares
-- CREATE POLICY "Public can view avatars" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');
