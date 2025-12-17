# 🌐 Lógica de Criação de Sites no RENDIZY - Exemplo: Medhome

**Data:** 01/12/2025  
**Versão:** v1.0.103.500  
**Status:** ✅ **PROCESSO COMPLETO DOCUMENTADO**

---

## 🎯 **VISÃO GERAL**

O RENDIZY permite que cada **imobiliária (organização)** tenha seu próprio **site personalizado** conectado ao backend. O site funciona como uma extensão do sistema, exibindo propriedades e permitindo reservas.

**Exemplo:** Medhome é uma imobiliária que precisa de um site para exibir suas acomodações para pacientes em tratamento médico.

---

## 📋 **PROCESSO COMPLETO (PASSO A PASSO)**

### **PASSO 1: Criar Organização (Imobiliária)**

**Onde:** Tela `/sites-clientes` → Botão "Criar Nova Imobiliária"

**O que acontece:**

1. Usuário preenche formulário:

   - Nome: "Medhome"
   - Email: "contato@medhome.com.br"
   - Telefone: "(11) 99999-9999"
   - Plano: "free" | "basic" | "professional" | "enterprise"

2. **Backend cria organização no SQL:**

   ```typescript
   // POST /organizations
   // Salva na tabela SQL: organizations
   {
     id: "uuid-gerado",
     name: "Medhome",
     slug: "rendizy_medhome",  // Gerado automaticamente
     email: "contato@medhome.com.br",
     plan: "free",
     status: "active"
   }
   ```

3. **✅ REGRA DE OURO:** Dados salvos em **SQL** (não KV Store)
   - Tabela: `organizations`
   - Persistência permanente
   - Multi-tenant seguro

**Resultado:** Organização criada e disponível na lista de imobiliárias.

---

### **PASSO 2: Criar Site para a Organização**

**Onde:** Tela `/sites-clientes` → Selecionar organização → Botão "Criar Site"

**O que acontece:**

1. Usuário preenche configuração do site:

   - **Site Name:** "MedHome"
   - **Template:** "custom" (para sites importados de Bolt/v0.dev)
   - **Theme:** Cores da marca
   - **Features:** Temporada, Locação, Venda
   - **Contact Info:** Email, telefone, redes sociais

2. **Backend cria configuração do site:**

   ```typescript
   // POST /client-sites
   // ⚠️ ATENÇÃO: Atualmente salva em KV Store (precisa migrar para SQL)
   {
     organizationId: "uuid-da-organizacao",
     siteName: "MedHome",
     subdomain: "medhome",  // Gerado automaticamente
     domain: "medhome.com.br",  // Opcional
     theme: {
       primaryColor: "#5DBEBD",
       secondaryColor: "#FF8B94",
       accentColor: "#10B981"
     },
     siteConfig: {
       title: "MedHome - Acomodações Humanizadas",
       description: "...",
       contactEmail: "contato@medhome.com.br",
       contactPhone: "(11) 99999-9999"
     },
     features: {
       shortTerm: true,  // Temporada
       longTerm: true,   // Locação
       sale: false       // Venda
     }
   }
   ```

3. **⚠️ PROBLEMA ATUAL:** Site salvo em **KV Store** (viola regras)
   - Chave: `client_site:{organizationId}`
   - **PRECISA MIGRAR PARA SQL** (tabela `client_sites`)

**Resultado:** Configuração do site criada, mas ainda sem código.

---

### **PASSO 3: Importar Código do Site (Medhome)**

**Onde:** Tela `/sites-clientes` → Selecionar site → Botão "Importar Site"

**Opções de Importação:**

#### **A. Importar de Bolt.ai / v0.dev (Código React)**

1. Usuário cola código React/TypeScript
2. Backend salva em `siteCode` (KV Store)
3. Site fica pronto para servir

#### **B. Upload de Arquivo (ZIP/TAR)**

1. Usuário faz upload do arquivo `medhome-site.tar.gz`
2. Backend salva no **Supabase Storage** (bucket `client-sites`)
3. Referência salva em `archivePath` (KV Store)

**Para Medhome:**

- **Arquivo:** `site bolt/site medhome/medhome-site.tar.gz`
- **Código fonte:** `site bolt/site medhome/src/`
- **Configuração:** `site bolt/site medhome/src/config/site.ts`

---

### **PASSO 4: Configurar Integração com Backend RENDIZY**

**Arquivo:** `site bolt/site medhome/src/config/site.ts`

**O que precisa ser configurado:**

```typescript
export const siteConfig = {
  // 1. ID da Organização (obtido do PASSO 1)
  organizationId: "{{ORG_ID}}", // ← UUID da organização criada

  // 2. Nome e domínio
  siteName: "MedHome",
  subdomain: "medhome",
  domain: "medhome.com.br",

  // 3. Assets (logos)
  logo: "/medhome_logo_hibrida_vertical logo oficial.png",
  logoIcon: "/medhome_logo_icone.png",
  favicon: "/medhome_logo_icone.png",

  // 4. Tema (cores da marca)
  theme: {
    primaryColor: "#5DBEBD", // Teal
    secondaryColor: "#FF8B94", // Coral
    accentColor: "#10B981",
    fontFamily: "Inter, sans-serif",
  },

  // 5. Configurações do site
  siteConfig: {
    title: "MedHome - Acomodações Humanizadas para Tratamento Médico",
    description: "...",
    slogan: "Conforto e cuidado quando você mais precisa",
    contactEmail: "contato@medhome.com.br",
    contactPhone: "(11) 99999-9999",
    socialMedia: {
      facebook: "https://facebook.com/medhome",
      instagram: "https://instagram.com/medhome",
      whatsapp: "5511999999999",
    },
  },

  // 6. Modalidades ativas
  features: {
    shortTerm: true, // Temporada
    longTerm: true, // Locação
    sale: false, // Venda
  },

  // 7. ⚠️ CRÍTICO: Configuração da API RENDIZY
  api: {
    projectId: "{{PROJECT_ID}}", // ← odcgnzfremrqnvtitpcc
    baseUrl: "{{API_BASE_URL}}", // ← URL do backend
    publicAnonKey: "{{PUBLIC_ANON_KEY}}", // ← Chave pública Supabase
  },
};
```

**Valores que precisam ser substituídos:**

- `{{ORG_ID}}` → UUID da organização criada no PASSO 1
- `{{PROJECT_ID}}` → `odcgnzfremrqnvtitpcc`
- `{{API_BASE_URL}}` → `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server`
- `{{PUBLIC_ANON_KEY}}` → Chave pública do Supabase

---

### **PASSO 5: Servir o Site**

**Atualmente (Preview/Teste):**

- **Rota:** `/rendizy-server/make-server-67caf26a/client-sites/serve/{domain}`
- **Exemplo:** `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/serve/medhome.rendizy.app`
- **Vantagem:** Funciona imediatamente, sem configurar DNS

**Futuro (Produção):**

- **URL:** `https://medhome.rendizy.app` (subdomínio)
- **Ou:** `https://medhome.com.br` (domínio customizado)
- **Requer:** Configuração de DNS

---

## 🔄 **FLUXO COMPLETO (DIAGRAMA)**

```
1. CRIAR ORGANIZAÇÃO
   └─> POST /organizations
       └─> Salva em SQL (tabela: organizations)
           └─> Retorna: { id: "uuid", name: "Medhome", slug: "rendizy_medhome" }

2. CRIAR SITE
   └─> POST /client-sites
       └─> Salva configuração (atualmente KV Store - precisa migrar para SQL)
           └─> Retorna: { subdomain: "medhome", ... }

3. IMPORTAR CÓDIGO
   └─> POST /client-sites/{orgId}/upload-code
       └─> Salva código do site (KV Store ou Storage)
           └─> Site fica pronto para servir

4. CONFIGURAR INTEGRAÇÃO
   └─> Editar site.ts com:
       - organizationId (UUID da organização)
       - projectId (odcgnzfremrqnvtitpcc)
       - baseUrl (URL do backend)
       - publicAnonKey (chave pública)

5. SERVIR SITE
   └─> GET /client-sites/serve/{domain}
       └─> Busca configuração (KV Store)
           └─> Serve código do site
               └─> Site funciona e busca propriedades do backend
```

---

## 📁 **ESTRUTURA DE ARQUIVOS DO MEDHOME**

```
site bolt/site medhome/
├── src/
│   ├── config/
│   │   └── site.ts          ← ⚠️ CONFIGURAÇÃO PRINCIPAL (precisa preencher placeholders)
│   ├── components/         ← Componentes React do site
│   ├── pages/              ← Páginas do site
│   ├── services/           ← Integração com API RENDIZY
│   └── App.tsx             ← Componente principal
├── public/
│   ├── medhome_logo_hibrida_vertical logo oficial.png
│   └── medhome_logo_icone.png
├── medhome-site.tar.gz     ← Arquivo compactado para upload
└── INSTRUCOES.md           ← Instruções de instalação
```

---

## ⚠️ **REGRAS DE OURO - O QUE PRECISA SER CUMPRIDO**

### **1. Dados Persistentes → SQL (NÃO KV Store)**

**✅ CORRETO:**

- Organização → Tabela SQL `organizations`
- Site → **PRECISA criar tabela SQL `client_sites`** (atualmente em KV Store)

**❌ ERRADO:**

- Salvar organização em KV Store
- Salvar site em KV Store (viola regras)

### **2. Multi-Tenant por Organization ID**

**Cada site pertence a uma organização:**

- Site busca propriedades da organização
- Site usa configurações da organização
- Site isola dados por `organizationId`

### **3. Integração com Backend RENDIZY**

**O site precisa:**

- Conectar ao backend RENDIZY
- Buscar propriedades da organização
- Permitir reservas via API
- Usar autenticação da organização

---

## 🔧 **CONFIGURAÇÃO DO MEDHOME (EXEMPLO PRÁTICO)**

### **1. Obter Organization ID**

Após criar organização "Medhome":

```sql
SELECT id, name, slug FROM organizations WHERE slug = 'rendizy_medhome';
-- Retorna: { id: "abc-123-def", name: "Medhome", slug: "rendizy_medhome" }
```

### **2. Preencher site.ts**

```typescript
export const siteConfig = {
  organizationId: "abc-123-def", // ← UUID obtido acima
  siteName: "MedHome",
  subdomain: "medhome",
  domain: "medhome.com.br",
  // ... resto da configuração
  api: {
    projectId: "odcgnzfremrqnvtitpcc",
    baseUrl:
      "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server",
    publicAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Chave pública Supabase
  },
};
```

### **3. Upload do Site**

**Opção A: Upload de código**

```typescript
// POST /client-sites/{orgId}/upload-code
{
  siteCode: "// Código React completo do Medhome";
}
```

**Opção B: Upload de arquivo**

```typescript
// POST /client-sites/{orgId}/upload-archive
// FormData com arquivo medhome-site.tar.gz
```

---

## 🎯 **CHECKLIST PARA CRIAR SITE (MEDHOME)**

### **ANTES DE COMEÇAR:**

- [ ] Organização "Medhome" criada no RENDIZY
- [ ] Organization ID obtido (UUID)
- [ ] Código do site Medhome pronto (`site bolt/site medhome/`)

### **PASSO 1: Criar Site**

- [ ] Acessar `/sites-clientes`
- [ ] Selecionar organização "Medhome"
- [ ] Clicar "Criar Site"
- [ ] Preencher:
  - Site Name: "MedHome"
  - Template: "custom"
  - Theme: Cores Medhome (#5DBEBD, #FF8B94)
  - Features: Temporada ✅, Locação ✅, Venda ❌
  - Contact: Email e telefone

### **PASSO 2: Configurar site.ts**

- [ ] Abrir `site bolt/site medhome/src/config/site.ts`
- [ ] Substituir `{{ORG_ID}}` pelo UUID da organização
- [ ] Substituir `{{PROJECT_ID}}` por `odcgnzfremrqnvtitpcc`
- [ ] Substituir `{{API_BASE_URL}}` pela URL do backend
- [ ] Substituir `{{PUBLIC_ANON_KEY}}` pela chave pública

### **PASSO 3: Importar Código**

- [ ] Opção A: Colar código React completo
- [ ] Opção B: Fazer upload de `medhome-site.tar.gz`
- [ ] Verificar se código foi salvo

### **PASSO 4: Testar Site**

- [ ] Clicar "Ver Site" na UI
- [ ] Verificar se site carrega
- [ ] Verificar se busca propriedades do backend
- [ ] Verificar se formulário de reserva funciona

---

## 🚨 **PROBLEMAS CONHECIDOS**

### **1. Sites Salvos em KV Store (Violação de Regras)**

**Status:** ⚠️ **PROBLEMA IDENTIFICADO**

**Atualmente:**

- Configuração do site salva em KV Store (`client_site:{organizationId}`)
- **VIOLA REGRA:** KV Store apenas para cache temporário

**Solução Necessária:**

- Criar tabela SQL `client_sites`
- Migrar dados de KV Store para SQL
- Atualizar rotas para usar SQL

**Arquivo afetado:**

- `supabase/functions/rendizy-server/routes-client-sites.ts`

### **2. Placeholders Não Substituídos**

**Status:** ⚠️ **PRECISA SER FEITO MANUALMENTE**

**Arquivo:** `site bolt/site medhome/src/config/site.ts`

**Placeholders:**

- `{{ORG_ID}}` → Precisa ser substituído pelo UUID
- `{{PROJECT_ID}}` → Precisa ser substituído
- `{{API_BASE_URL}}` → Precisa ser substituído
- `{{PUBLIC_ANON_KEY}}` → Precisa ser substituído

**Solução Futura:**

- Automatizar substituição durante upload
- Ou criar script de build que substitui automaticamente

---

## 📚 **ARQUIVOS RELACIONADOS**

### **Backend:**

- `supabase/functions/rendizy-server/routes-client-sites.ts` - Rotas de sites
- `supabase/functions/rendizy-server/routes-organizations.ts` - Rotas de organizações

### **Frontend:**

- `RendizyPrincipal/components/ClientSitesManager.tsx` - Gerenciador de sites
- `RendizyPrincipal/components/CreateOrganizationModal.tsx` - Criar organização

### **Site Medhome:**

- `site bolt/site medhome/src/config/site.ts` - Configuração principal
- `site bolt/site medhome/src/App.tsx` - Componente principal
- `site bolt/site medhome/INSTRUCOES.md` - Instruções

### **Documentação:**

- `ARQUITETURA_SITES_CLIENTES.md` - Arquitetura completa
- `Ligando os motores.md` - Regras de ouro

---

## 🎯 **RESUMO EXECUTIVO**

**Para criar o site Medhome no RENDIZY:**

1. ✅ **Criar organização** "Medhome" → Salva em SQL
2. ✅ **Criar site** para organização → Atualmente KV Store (precisa migrar)
3. ✅ **Configurar site.ts** → Preencher placeholders com dados reais
4. ✅ **Importar código** → Upload de código ou arquivo
5. ✅ **Servir site** → Via rota `/serve/{domain}`

**⚠️ ATENÇÃO:**

- Sites atualmente salvos em KV Store (viola regras)
- Precisa migrar para SQL (tabela `client_sites`)
- Placeholders precisam ser substituídos manualmente

---

**STATUS:** 📋 **PROCESSO DOCUMENTADO - PRONTO PARA IMPLEMENTAÇÃO**
