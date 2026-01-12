-- Execute este SQL no Supabase Dashboard -> SQL Editor
-- Adiciona coluna para armazenar o ID do webhook criado no Stripe

ALTER TABLE stripe_configs 
ADD COLUMN IF NOT EXISTS stripe_webhook_id TEXT DEFAULT NULL;

-- Verificar se foi adicionado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stripe_configs';
