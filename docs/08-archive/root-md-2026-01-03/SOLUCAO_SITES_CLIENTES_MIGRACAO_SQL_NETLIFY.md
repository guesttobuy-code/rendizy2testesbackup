# 🔧 Solução: Migração Sites de Clientes (KV Store → SQL + Netlify)

**Data:** 01/12/2025  
**Status:** 🚨 **PROBLEMAS IDENTIFICADOS - SOLUÇÕES PROPOSTAS**

---

## 🚨 **PROBLEMAS IDENTIFICADOS**

### **1. Sites Salvos em KV Store (VIOLA REGRAS DE OURO)**

**Status:** ❌ **VIOLAÇÃO CRÍTICA**

**Problema:**
- Configuração de sites salva em KV Store (`client_site:{organizationId}`)
- **VIOLA REGRA:** KV Store apenas para cache temporário (<24h TTL)
- Sites são dados **permanentes** que devem estar em SQL

**Impacto:**
- Dados podem ser perdidos (KV Store não é persistente)
- Não segue arquitetura multi-tenant estabelecida
- Dificulta consultas e relatórios

---

### **2. Domínio de Exposição Incorreto**

**Status:** ❌ **ARQUITETURA INCORRETA**

**Problema Atual:**
- Sites servidos via Supabase Edge Functions: `/client-sites/serve/medhome.rendizy.app`
- URL complexa e não otimizada para sites estáticos
- Supabase Edge Functions não é ideal para servir sites React/SPA

**URL Atual (ERRADA):**
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app
```

**URL do RENDIZY (Netlify):**
```
https://adorable-biscochitos-59023a.netlify.app
```

**Problema:**
- Sites deveriam ser servidos pelo **Netlify** (onde o RENDIZY está)
- URLs mais limpas e otimizadas
- Melhor performance para sites estáticos

---

## ✅ **SOLUÇÕES PROPOSTAS**

### **SOLUÇÃO 1: Migrar Sites de KV Store para SQL**

#### **1.1 Criar Tabela SQL `client_sites`**

```sql
-- Migration: Criar tabela client_sites
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
```

#### **1.2 Migrar Dados de KV Store para SQL**

```sql
-- Script de migração (executar após criar tabela)
-- NOTA: Este script precisa ser adaptado para ler do KV Store via Edge Function
-- ou executado manualmente copiando dados

-- Exemplo de inserção (ajustar conforme dados reais do KV Store):
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

#### **1.3 Atualizar Rotas para Usar SQL**

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts`

**Mudanças necessárias:**
- Remover uso de `kv.get()` e `kv.set()`
- Usar `getSupabaseClient()` para acessar SQL
- Atualizar todas as rotas para usar tabela `client_sites`

---

### **SOLUÇÃO 2: Repensar Arquitetura de Exposição (Netlify)**

#### **2.1 Problema com Arquitetura Atual**

**Atualmente:**
- Sites servidos via Supabase Edge Functions
- URL complexa e não otimizada
- Supabase não é ideal para servir sites React/SPA

**Por que não funciona bem:**
- Edge Functions são para APIs, não para servir sites estáticos
- Performance inferior para sites React
- URLs não são amigáveis
- Dificulta SEO

#### **2.2 Nova Arquitetura Proposta**

**Opção A: Sites como Rotas do RENDIZY (Recomendado)**

**URLs:**
```
https://adorable-biscochitos-59023a.netlify.app/sites/medhome
https://adorable-biscochitos-59023a.netlify.app/sites/{subdomain}
```

**Vantagens:**
- ✅ URLs limpas e amigáveis
- ✅ Servido pelo Netlify (otimizado para sites estáticos)
- ✅ Mesmo domínio do RENDIZY (sem problemas de CORS)
- ✅ Fácil de implementar (rota React)

**Implementação:**
1. Criar rota em `App.tsx`: `/sites/:subdomain`
2. Componente busca configuração do site via API
3. Renderiza site do cliente

**Opção B: Subdomínios Netlify (Futuro)**

**URLs:**
```
https://medhome.rendizy.app
https://{subdomain}.rendizy.app
```

**Vantagens:**
- ✅ URLs ainda mais limpas
- ✅ SEO melhor (domínio próprio)
- ✅ Branding independente

**Desvantagens:**
- ⚠️ Requer configuração de DNS
- ⚠️ Requer domínio próprio (`rendizy.app`)
- ⚠️ Mais complexo de implementar

**Recomendação:** Começar com **Opção A**, migrar para **Opção B** depois.

---

## 🎯 **PLANO DE IMPLEMENTAÇÃO**

### **FASE 1: Migrar para SQL (CRÍTICO)**

**Prioridade:** 🔴 **ALTA** (viola regras de ouro)

1. ✅ Criar migration SQL `client_sites`
2. ✅ Aplicar migration no Supabase
3. ✅ Migrar dados existentes de KV Store para SQL
4. ✅ Atualizar rotas backend para usar SQL
5. ✅ Remover código de KV Store
6. ✅ Testar criação/edição de sites

**Tempo estimado:** 2-3 horas

---

### **FASE 2: Repensar Exposição (Netlify)**

**Prioridade:** 🟡 **MÉDIA** (melhora UX, mas não é crítico)

#### **Opção A: Rotas do RENDIZY (Implementação Rápida)**

1. ✅ Criar rota `/sites/:subdomain` no `App.tsx`
2. ✅ Criar componente `ClientSiteViewer.tsx`
3. ✅ Buscar configuração do site via API
4. ✅ Renderizar site do cliente
5. ✅ Atualizar botão "Ver Site" para usar nova URL
6. ✅ Testar com Medhome

**Tempo estimado:** 3-4 horas

#### **Opção B: Subdomínios Netlify (Futuro)**

1. ⏳ Configurar domínio `rendizy.app`
2. ⏳ Configurar DNS wildcard (`*.rendizy.app`)
3. ⏳ Configurar Netlify para aceitar subdomínios
4. ⏳ Criar middleware de roteamento
5. ⏳ Migrar sites para nova estrutura

**Tempo estimado:** 1-2 dias

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **FASE 1: Migração SQL**

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

### **FASE 2: Exposição Netlify (Opção A)**

- [ ] Criar rota `/sites/:subdomain` no `App.tsx`
- [ ] Criar componente `ClientSiteViewer.tsx`
- [ ] Implementar busca de configuração via API
- [ ] Implementar renderização do site
- [ ] Atualizar botão "Ver Site" no `ClientSitesManager.tsx`
- [ ] Testar com site Medhome
- [ ] Verificar URLs funcionando
- [ ] Atualizar documentação

---

## 🔧 **IMPLEMENTAÇÃO DETALHADA**

### **1. Migration SQL Completa**

**Arquivo:** `supabase/migrations/20251201_create_client_sites_table.sql`

```sql
-- Migration: Criar tabela client_sites
-- Data: 2025-12-01
-- Descrição: Migra sites de clientes de KV Store para SQL

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
  
  -- Configurações (JSONB para flexibilidade)
  theme JSONB NOT NULL DEFAULT '{}',
  site_config JSONB NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}',
  
  -- Assets
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Código do site
  site_code TEXT,
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

### **2. Atualizar Rotas Backend**

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts`

**Mudanças principais:**
- Remover: `import * as kv from './kv_store.tsx';`
- Adicionar: `import { getSupabaseClient } from './kv_store.tsx';`
- Substituir todas as chamadas `kv.get()` por queries SQL
- Substituir todas as chamadas `kv.set()` por inserts/updates SQL

**Exemplo de mudança:**

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

### **3. Criar Rota no Frontend (Netlify)**

**Arquivo:** `RendizyPrincipal/App.tsx`

**Adicionar rota:**
```tsx
<Route path="/sites/:subdomain" element={<ClientSiteViewer />} />
```

**Arquivo:** `RendizyPrincipal/components/ClientSiteViewer.tsx` (NOVO)

```tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function ClientSiteViewer() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar configuração do site via API
    const fetchSite = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/by-subdomain/${subdomain}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const data = await response.json();
        if (data.success) {
          setSiteConfig(data.data);
        }
      } catch (error) {
        console.error('Erro ao buscar site:', error);
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchSite();
    }
  }, [subdomain]);

  if (loading) {
    return <div>Carregando site...</div>;
  }

  if (!siteConfig) {
    return <div>Site não encontrado</div>;
  }

  // Renderizar site do cliente
  if (siteConfig.siteCode) {
    return <div dangerouslySetInnerHTML={{ __html: siteConfig.siteCode }} />;
  }

  return <div>Site em construção</div>;
}
```

---

## 🎯 **URLs FINAIS (APÓS IMPLEMENTAÇÃO)**

### **Antes (ERRADO):**
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app
```

### **Depois (CORRETO - Opção A):**
```
https://adorable-biscochitos-59023a.netlify.app/sites/medhome
```

### **Futuro (Opção B):**
```
https://medhome.rendizy.app
```

---

## 📚 **ARQUIVOS QUE PRECISAM SER MODIFICADOS**

### **Backend:**
- ✅ `supabase/migrations/20251201_create_client_sites_table.sql` (NOVO)
- ✅ `supabase/functions/rendizy-server/routes-client-sites.ts` (ATUALIZAR)
- ✅ Criar rota: `GET /client-sites/by-subdomain/:subdomain` (NOVO)

### **Frontend:**
- ✅ `RendizyPrincipal/App.tsx` (ADICIONAR ROTA)
- ✅ `RendizyPrincipal/components/ClientSiteViewer.tsx` (NOVO)
- ✅ `RendizyPrincipal/components/ClientSitesManager.tsx` (ATUALIZAR URL "Ver Site")

### **Documentação:**
- ✅ `LOGICA_CRIACAO_SITES_RENDIZY_MEDHOME.md` (ATUALIZAR)
- ✅ `ARQUITETURA_SITES_CLIENTES.md` (ATUALIZAR)

---

## 🚨 **IMPORTANTE: ORDEM DE IMPLEMENTAÇÃO**

1. **PRIMEIRO:** Migrar para SQL (FASE 1)
   - Resolve violação de regras
   - Dados persistentes garantidos
   - Base para futuras melhorias

2. **SEGUNDO:** Repensar exposição (FASE 2)
   - Melhora UX
   - URLs mais limpas
   - Melhor performance

**⚠️ NÃO fazer FASE 2 antes de FASE 1!**

---

## 🎯 **RESUMO EXECUTIVO**

**Problemas:**
1. ❌ Sites em KV Store (viola regras)
2. ❌ URLs complexas via Supabase Edge Functions

**Soluções:**
1. ✅ Migrar para SQL (tabela `client_sites`)
2. ✅ Servir sites via Netlify (`/sites/:subdomain`)

**Benefícios:**
- ✅ Dados persistentes em SQL
- ✅ URLs limpas e amigáveis
- ✅ Melhor performance
- ✅ Segue regras de ouro
- ✅ Arquitetura correta

---

**STATUS:** 📋 **SOLUÇÕES PROPOSTAS - AGUARDANDO IMPLEMENTAÇÃO**

