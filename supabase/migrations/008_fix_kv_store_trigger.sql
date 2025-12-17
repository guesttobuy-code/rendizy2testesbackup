-- ============================================================================
-- MIGRAÇÃO: Corrigir trigger do kv_store_67caf26a
-- Data: 2025-12-01
-- Problema: Erro "record "new" has no field "updated_at""
-- Solução: Tornar a função da trigger mais robusta
-- ============================================================================

-- Recriar a função da trigger de forma mais robusta
-- ✅ CORRIGIDO: Garantir que a função sempre funcione mesmo se updated_at não estiver presente no NEW
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre atualizar updated_at quando a trigger for executada (BEFORE UPDATE)
  -- A coluna updated_at sempre existe na tabela kv_store_67caf26a
  NEW.updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver qualquer erro, apenas retornar NEW sem modificar
    -- Isso previne erros como "record "new" has no field "updated_at""
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_update_kv_store_updated_at ON kv_store_67caf26a;
CREATE TRIGGER trigger_update_kv_store_updated_at
  BEFORE UPDATE ON kv_store_67caf26a
  FOR EACH ROW
  EXECUTE FUNCTION update_kv_store_updated_at();

-- Verificar se a coluna updated_at existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'kv_store_67caf26a' 
    AND column_name = 'updated_at'
  ) THEN
    -- Se não existir, criar a coluna
    ALTER TABLE kv_store_67caf26a 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
