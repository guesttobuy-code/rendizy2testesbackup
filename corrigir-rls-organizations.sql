-- ============================================================================
-- CORREÇÃO: RLS da tabela organizations
-- Garantir que Service Role Key pode acessar
-- ============================================================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Super admins can do everything" ON organizations;
DROP POLICY IF EXISTS "Allow all operations via service role" ON organizations;

-- Criar política que permite TUDO (Service Role Key bypassa RLS, mas garantimos)
-- Esta política permite acesso para qualquer role, incluindo service_role
CREATE POLICY "Allow all operations via service role" 
ON organizations 
FOR ALL 
TO public
USING (true) 
WITH CHECK (true);

-- Verificar se RLS está habilitado
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Comentário
COMMENT ON POLICY "Allow all operations via service role" ON organizations IS 
'Permite todas operações para Service Role Key (Edge Functions). Service Role Key já bypassa RLS, mas esta política garante acesso mesmo se houver problemas.';

-- Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ RLS corrigido para organizations';
  RAISE NOTICE '   - Política "Allow all operations via service role" criada';
  RAISE NOTICE '   - Service Role Key pode acessar todas organizações';
END $$;

