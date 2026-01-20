-- ============================================================================
-- TABELA: evolution_instances
-- Armazena instâncias Evolution API por usuário (Multi-Tenant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  instance_name TEXT NOT NULL,
  instance_api_key TEXT NOT NULL,
  global_api_key TEXT,
  base_url TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id) -- Um usuário = uma instância
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_evolution_instances_user 
ON evolution_instances(user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_evolution_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Evita erro se o trigger já existir (reset/replay)
DROP TRIGGER IF EXISTS trigger_update_evolution_instances_updated_at ON evolution_instances;

CREATE TRIGGER trigger_update_evolution_instances_updated_at
  BEFORE UPDATE ON evolution_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_evolution_instances_updated_at();

-- Row Level Security (RLS)
ALTER TABLE evolution_instances ENABLE ROW LEVEL SECURITY;

-- Evita erro de duplicidade ao reaplicar migrações
DROP POLICY IF EXISTS "Users can view their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Users can update their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Users can insert their own instance" ON evolution_instances;
DROP POLICY IF EXISTS "Admin can view all instances" ON evolution_instances;

-- Policy: Usuário só vê sua própria instância
CREATE POLICY "Users can view their own instance" 
ON evolution_instances 
FOR SELECT 
USING (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Usuário pode atualizar sua própria instância
CREATE POLICY "Users can update their own instance" 
ON evolution_instances 
FOR UPDATE 
USING (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Usuário pode inserir sua própria instância
CREATE POLICY "Users can insert their own instance" 
ON evolution_instances 
FOR INSERT 
WITH CHECK (user_id = (current_setting('request.jwt.claims')::json->>'user_id')::integer);

-- Policy: Admin vê todas as instâncias
CREATE POLICY "Admin can view all instances" 
ON evolution_instances 
FOR ALL 
USING ((current_setting('request.jwt.claims')::json->>'user_id')::integer = 1);

-- Comentários
COMMENT ON TABLE evolution_instances IS 'Instâncias Evolution API por usuário (multi-tenant)';
COMMENT ON COLUMN evolution_instances.user_id IS 'ID do usuário dono da instância';
COMMENT ON COLUMN evolution_instances.instance_name IS 'Nome da instância (ex: TESTE)';
COMMENT ON COLUMN evolution_instances.instance_api_key IS 'API Key específica da instância';
COMMENT ON COLUMN evolution_instances.global_api_key IS 'Global API Key (opcional)';
COMMENT ON COLUMN evolution_instances.base_url IS 'URL base da Evolution API';

-- Inserir instância padrão do superadmin (user_id = 1)
INSERT INTO evolution_instances (user_id, instance_name, instance_api_key, global_api_key, base_url)
VALUES (
  1, 
  'TESTE',
  'F3DC26A42BF1-4FDE-A190-F8BCBE827501',
  '4de7861e944e291b56fe9781d2b00b36',
  'https://evo.boravendermuito.com.br'
)
ON CONFLICT (user_id) DO NOTHING;



