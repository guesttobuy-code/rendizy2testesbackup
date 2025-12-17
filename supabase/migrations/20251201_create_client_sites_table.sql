-- Migration: Criar tabela client_sites
-- Data: 01/12/2025
-- Descrição: Migra sites de clientes de KV Store para SQL (conforme Regras de Ouro)

CREATE TABLE IF NOT EXISTS client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identificação
  site_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(255), -- Domínio customizado (opcional)
  
  -- Template e fonte
  template VARCHAR(50) DEFAULT 'moderno',
  source VARCHAR(50) DEFAULT 'custom', -- 'bolt' | 'v0' | 'figma' | 'custom'
  
  -- Tema (JSONB para flexibilidade)
  theme JSONB NOT NULL DEFAULT '{}',
  
  -- Configurações do site (JSONB)
  site_config JSONB NOT NULL DEFAULT '{}',
  
  -- Features (JSONB)
  features JSONB NOT NULL DEFAULT '{}',
  
  -- Assets
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Código do site
  site_code TEXT, -- Código HTML/React serializado
  archive_path TEXT, -- Caminho no Storage (se for arquivo)
  archive_url TEXT, -- URL do arquivo no Storage
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_org_site UNIQUE (organization_id),
  CONSTRAINT valid_template CHECK (template IN ('custom', 'moderno', 'classico', 'luxo')),
  CONSTRAINT valid_source CHECK (source IN ('bolt', 'v0', 'figma', 'custom'))
);

-- Índices para performance
CREATE INDEX idx_client_sites_organization_id ON client_sites(organization_id);
CREATE INDEX idx_client_sites_subdomain ON client_sites(subdomain);
CREATE INDEX idx_client_sites_domain ON client_sites(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_client_sites_active ON client_sites(is_active) WHERE is_active = true;

-- RLS (Row Level Security)
ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;

-- Política: Service Role pode fazer tudo
CREATE POLICY "Service role can do everything" ON client_sites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_client_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_sites_updated_at
  BEFORE UPDATE ON client_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_client_sites_updated_at();

-- Comentários para documentação
COMMENT ON TABLE client_sites IS 'Sites de clientes - dados permanentes (migrado de KV Store)';
COMMENT ON COLUMN client_sites.organization_id IS 'Referência à organização dona do site';
COMMENT ON COLUMN client_sites.subdomain IS 'Subdomínio único (ex: medhome.rendizy.app)';
COMMENT ON COLUMN client_sites.site_code IS 'Código HTML/React do site (se enviado via código)';
COMMENT ON COLUMN client_sites.archive_path IS 'Caminho do arquivo ZIP no Storage';
COMMENT ON COLUMN client_sites.archive_url IS 'URL assinada do arquivo ZIP no Storage';

