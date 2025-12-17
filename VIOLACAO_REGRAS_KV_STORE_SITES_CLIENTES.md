# 🚨 Violação de Regras: Sites de Clientes em KV Store

**Data:** 01/12/2025  
**Status:** ⚠️ **VIOLAÇÃO IDENTIFICADA - CORREÇÃO NECESSÁRIA**

---

## 🚨 **PROBLEMA IDENTIFICADO**

### **Violação da Regra de Ouro:**

**Regra:** KV Store apenas para cache temporário (<24h TTL)  
**Realidade:** Sites de clientes estão sendo salvos em KV Store  
**Impacto:** Dados podem ser perdidos (KV Store não é persistente)

---

## 📋 **O QUE ESTÁ SENDO SALVO EM KV STORE (ERRADO)**

### **1. Configuração do Site**
- **Chave:** `client_site:{organizationId}`
- **Conteúdo:** Toda a configuração do site (ClientSiteConfig)
- **Problema:** Dados permanentes em cache temporário

### **2. Código do Site (siteCode)**
- **Armazenado em:** KV Store dentro de `ClientSiteConfig`
- **Problema:** Código HTML/React pode ser perdido

### **3. Referência ao Arquivo ZIP**
- **archivePath:** Caminho no Storage (correto)
- **archiveUrl:** URL assinada (correto)
- **Mas:** Referência salva em KV Store (errado)

---

## ✅ **O QUE ESTÁ CORRETO**

### **Arquivos ZIP/TAR**
- ✅ Salvos no **Supabase Storage** (bucket `client-sites`)
- ✅ Persistência garantida
- ✅ Não viola regras

---

## 🔧 **SOLUÇÃO: MIGRAR PARA SQL**

### **1. Criar Tabela SQL `client_sites`**

```sql
CREATE TABLE IF NOT EXISTS client_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identificação
  site_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL UNIQUE,
  domain VARCHAR(255),
  
  -- Template e fonte
  template VARCHAR(50) DEFAULT 'moderno',
  source VARCHAR(50) DEFAULT 'custom',
  
  -- Configurações (JSONB)
  theme JSONB NOT NULL DEFAULT '{}',
  site_config JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  
  -- Assets
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Código do site (TEXT para códigos grandes)
  site_code TEXT,
  
  -- Arquivos (referências ao Storage)
  archive_path TEXT,
  archive_url TEXT,
  
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

-- Índices
CREATE INDEX idx_client_sites_organization_id ON client_sites(organization_id);
CREATE INDEX idx_client_sites_subdomain ON client_sites(subdomain);
CREATE INDEX idx_client_sites_domain ON client_sites(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_client_sites_active ON client_sites(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything" ON client_sites
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
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
```

### **2. Migrar Dados de KV Store para SQL**

```sql
-- Script de migração (executar após criar tabela)
-- NOTA: Precisa ler do KV Store via Edge Function ou executar manualmente

-- Exemplo de inserção (ajustar conforme dados reais):
INSERT INTO client_sites (
  organization_id,
  site_name,
  subdomain,
  domain,
  template,
  source,
  theme,
  site_config,
  features,
  logo_url,
  favicon_url,
  site_code,
  archive_path,
  archive_url,
  is_active
) VALUES (
  'uuid-da-organizacao',
  'MedHome',
  'medhome',
  'medhome.com.br',
  'custom',
  'bolt',
  '{"primaryColor": "#5DBEBD", "secondaryColor": "#FF8B94"}'::jsonb,
  '{"title": "MedHome", "contactEmail": "contato@medhome.com.br"}'::jsonb,
  '{"shortTerm": true, "longTerm": true, "sale": false}'::jsonb,
  NULL,
  NULL,
  NULL, -- site_code (se houver)
  NULL, -- archive_path (se houver)
  NULL, -- archive_url (se houver)
  true
);
```

### **3. Atualizar Rotas Backend**

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts`

**Mudanças:**
- Remover: `import * as kv from './kv_store.tsx';`
- Adicionar: `import { getSupabaseClient } from './kv_store.tsx';`
- Substituir todas as chamadas `kv.get()` por queries SQL
- Substituir todas as chamadas `kv.set()` por inserts/updates SQL

**Exemplo:**
```typescript
// ❌ ANTES (KV Store)
const site = await kv.get<ClientSiteConfig>(`client_site:${orgId}`);

// ✅ DEPOIS (SQL)
const client = getSupabaseClient();
const { data: site, error } = await client
  .from('client_sites')
  .select('*')
  .eq('organization_id', orgId)
  .maybeSingle();
```

---

## 📊 **ARQUITETURA CORRETA (APÓS MIGRAÇÃO)**

### **Dados Persistentes → SQL**
- ✅ Configuração do site → Tabela `client_sites`
- ✅ Código do site (siteCode) → Coluna `site_code` (TEXT)
- ✅ Referências a arquivos → Colunas `archive_path`, `archive_url`

### **Arquivos → Supabase Storage**
- ✅ Arquivos ZIP/TAR → Bucket `client-sites`
- ✅ Assets (logos, imagens) → Bucket `client-sites` ou `public`

### **Cache Temporário → KV Store (Opcional)**
- ✅ Cache de sites servidos (se necessário)
- ✅ TTL: <24h
- ✅ Apenas para performance, não para persistência

---

## 🎯 **PRIORIDADE**

**🔴 ALTA** - Violação crítica das regras de ouro

**Impacto:**
- Dados podem ser perdidos
- Sites podem sumir (como aconteceu com Medhome)
- Não segue arquitetura estabelecida

**Solução:**
- Migrar para SQL o quanto antes
- Manter arquivos no Storage (já está correto)

---

## 📋 **CHECKLIST DE MIGRAÇÃO**

- [ ] Criar migration SQL `client_sites`
- [ ] Aplicar migration no Supabase
- [ ] Criar script de migração de dados (KV Store → SQL)
- [ ] Executar migração de dados
- [ ] Atualizar `routes-client-sites.ts` para usar SQL
- [ ] Remover código de KV Store
- [ ] Testar criação de novo site
- [ ] Testar edição de site existente
- [ ] Testar listagem de sites
- [ ] Verificar que dados estão em SQL (não KV Store)
- [ ] Documentar mudança

---

**STATUS:** 🚨 **VIOLAÇÃO IDENTIFICADA - AGUARDANDO CORREÇÃO**

