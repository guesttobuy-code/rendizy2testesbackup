# Aplicar Migration: Adicionar Colunas de Webhook

## Problema
As rotas de webhook estão retornando erro 500 porque as colunas `webhook_url`, `webhook_events` e `webhook_by_events` não existem na tabela `organization_channel_config`.

## Solução
Aplicar a migration `20241120_add_webhook_columns_to_channel_config.sql` no Supabase.

## Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione o projeto: `odcgnzfremrqnvtitpcc`
3. Vá em **SQL Editor**
4. Cole o seguinte SQL e execute:

```sql
-- Adicionar colunas de webhook se não existirem
DO $$
BEGIN
  -- Adicionar webhook_url se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_url TEXT;
  END IF;

  -- Adicionar webhook_events se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_events'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_events TEXT[];
  END IF;

  -- Adicionar webhook_by_events se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_channel_config' 
    AND column_name = 'webhook_by_events'
  ) THEN
    ALTER TABLE organization_channel_config 
    ADD COLUMN webhook_by_events BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN organization_channel_config.webhook_url IS 'URL do webhook configurado na Evolution API';
COMMENT ON COLUMN organization_channel_config.webhook_events IS 'Array de eventos monitorados pelo webhook';
COMMENT ON COLUMN organization_channel_config.webhook_by_events IS 'Se true, cria uma rota de webhook diferente para cada tipo de evento';
```

### Opção 2: Via Supabase CLI (se disponível)
```bash
supabase db push
```

## Verificação
Após aplicar, verifique se as colunas foram criadas:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organization_channel_config' 
AND column_name IN ('webhook_url', 'webhook_events', 'webhook_by_events');
```

## Nota
O código do backend já foi corrigido para funcionar mesmo sem essas colunas (usando try/catch), mas para salvar a configuração do webhook no banco, as colunas são necessárias.

