# 🚀 Guia Completo de Configuração do Supabase - Rendizy

**Data:** 15/11/2025  
**Versão:** 1.0  
**Projeto:** odcgnzfremrqnvtitpcc

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Passo 1: Criar Tabela KV Store](#passo-1-criar-tabela-kv-store)
3. [Passo 2: Criar Tabela de Configurações de Canais](#passo-2-criar-tabela-de-configurações-de-canais)
4. [Passo 3: Criar Tabela de Instâncias Evolution](#passo-3-criar-tabela-de-instâncias-evolution)
5. [Passo 4: Configurar Secrets (Variáveis de Ambiente)](#passo-4-configurar-secrets-variáveis-de-ambiente)
6. [Passo 5: Verificar Configuração](#passo-5-verificar-configuração)
7. [Checklist Final](#checklist-final)

---

## 📋 Pré-requisitos

- ✅ Conta no Supabase: https://supabase.com
- ✅ Acesso ao projeto: `odcgnzfremrqnvtitpcc`
- ✅ Navegador web

---

## 🗄️ Passo 1: Criar Tabela KV Store

**Esta é a tabela principal onde todos os dados são salvos (imóveis, reservas, usuários, etc.)**

### 📝 Script SQL:

```sql
-- ============================================================================
-- TABELA: kv_store_67caf26a
-- Tabela principal Key-Value Store para todos os dados do sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS kv_store_67caf26a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por prefixo
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix 
ON kv_store_67caf26a(key text_pattern_ops);

-- Índice GIN para busca dentro do JSONB
CREATE INDEX IF NOT EXISTS idx_kv_store_value_gin 
ON kv_store_67caf26a USING GIN(value);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_kv_store_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kv_store_updated_at
  BEFORE UPDATE ON kv_store_67caf26a
  FOR EACH ROW
  EXECUTE FUNCTION update_kv_store_updated_at();

-- Comentários
COMMENT ON TABLE kv_store_67caf26a IS 'Tabela principal Key-Value Store para todos os dados do sistema Rendizy';
COMMENT ON COLUMN kv_store_67caf26a.key IS 'Chave única (ex: org:123, acc:456, reservation:789)';
COMMENT ON COLUMN kv_store_67caf26a.value IS 'Valor em formato JSON (JSONB)';
```

### ✅ Como Executar:

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **+ New query**
4. Cole o script SQL acima
5. Clique em **RUN** (ou pressione `Ctrl+Enter`)
6. Aguarde: **Success. No rows returned**

---

## 🗄️ Passo 2: Criar Tabela de Configurações de Canais

**Esta tabela armazena configurações de WhatsApp, SMS e outros canais de comunicação**

### 📝 Script SQL:

```sql
-- ============================================================================
-- TABELA: organization_channel_config
-- Armazena configurações de canais de comunicação (WhatsApp, SMS, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_channel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE,
  
  -- WhatsApp (Evolution API)
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_api_url TEXT,
  whatsapp_instance_name TEXT,
  whatsapp_api_key TEXT,
  whatsapp_instance_token TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_phone_number TEXT,
  whatsapp_qr_code TEXT,
  whatsapp_connection_status TEXT DEFAULT 'disconnected',
  whatsapp_last_connected_at TIMESTAMPTZ,
  whatsapp_error_message TEXT,
  
  -- SMS (Twilio) - Futuro
  sms_enabled BOOLEAN DEFAULT false,
  sms_account_sid TEXT,
  sms_auth_token TEXT,
  sms_phone_number TEXT,
  sms_credits_used INTEGER DEFAULT 0,
  sms_last_recharged_at TIMESTAMPTZ,
  
  -- Automations
  automation_reservation_confirmation BOOLEAN DEFAULT false,
  automation_checkin_reminder BOOLEAN DEFAULT false,
  automation_checkout_review BOOLEAN DEFAULT false,
  automation_payment_reminder BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por organization_id
CREATE INDEX IF NOT EXISTS idx_channel_config_org 
ON organization_channel_config(organization_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_channel_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_config_updated_at
  BEFORE UPDATE ON organization_channel_config
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_config_updated_at();

-- Row Level Security (RLS)
ALTER TABLE organization_channel_config ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir todas operações (ajustar conforme necessidade de segurança)
CREATE POLICY "Allow all operations on channel_config" 
ON organization_channel_config 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE organization_channel_config IS 'Configurações de canais de comunicação (WhatsApp, SMS, Email) por organização';
COMMENT ON COLUMN organization_channel_config.organization_id IS 'ID único da organização/imobiliária';
COMMENT ON COLUMN organization_channel_config.whatsapp_api_url IS 'URL base da Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_instance_name IS 'Nome da instância no Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_api_key IS 'Global API Key do Evolution API';
COMMENT ON COLUMN organization_channel_config.whatsapp_instance_token IS 'Token específico da instância';
```

### ✅ Como Executar:

1. No **SQL Editor**, clique em **+ New query**
2. Cole o script SQL acima
3. Clique em **RUN**
4. Aguarde: **Success. No rows returned**

---

## 🗄️ Passo 3: Criar Tabela de Instâncias Evolution

**Esta tabela permite múltiplas instâncias WhatsApp por usuário (Multi-Tenant)**

### 📝 Script SQL:

```sql
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

CREATE TRIGGER trigger_update_evolution_instances_updated_at
  BEFORE UPDATE ON evolution_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_evolution_instances_updated_at();

-- Row Level Security (RLS)
ALTER TABLE evolution_instances ENABLE ROW LEVEL SECURITY;

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
-- ⚠️ IMPORTANTE: Substitua as credenciais abaixo pelas suas credenciais reais!
INSERT INTO evolution_instances (user_id, instance_name, instance_api_key, global_api_key, base_url)
VALUES (
  1, 
  'Rendizy',
  'SUBSTITUA_PELO_INSTANCE_TOKEN_REAL',
  'SUBSTITUA_PELA_GLOBAL_API_KEY_REAL',
  'https://evo.boravendermuito.com.br'
)
ON CONFLICT (user_id) DO NOTHING;
```

### ⚠️ IMPORTANTE - Antes de Executar:

**Substitua os valores no INSERT:**
- `SUBSTITUA_PELO_INSTANCE_TOKEN_REAL` → Seu Instance Token da Evolution API
- `SUBSTITUA_PELA_GLOBAL_API_KEY_REAL` → Sua Global API Key da Evolution API

**Ou remova a linha do INSERT e adicione depois manualmente via dashboard.**

### ✅ Como Executar:

1. No **SQL Editor**, clique em **+ New query**
2. Cole o script SQL acima (após substituir as credenciais)
3. Clique em **RUN**
4. Aguarde: **Success. 1 row(s) returned** (se inseriu o superadmin)

---

## 🔐 Passo 4: Configurar Secrets (Variáveis de Ambiente)

**As Edge Functions precisam das credenciais da Evolution API**

### 📝 Como Configurar:

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. Vá em **Settings** → **Edge Functions** → **Secrets**
3. Clique em **Add new secret**
4. Adicione os seguintes secrets:

| Nome da Variável | Valor | Descrição |
|-----------------|-------|-----------|
| `EVOLUTION_API_URL` | `https://evo.boravendermuito.com.br` | URL base da Evolution API |
| `EVOLUTION_INSTANCE_NAME` | `Rendizy` | Nome da instância |
| `EVOLUTION_GLOBAL_API_KEY` | `SUA_GLOBAL_API_KEY_AQUI` | Global API Key |
| `EVOLUTION_INSTANCE_TOKEN` | `SEU_INSTANCE_TOKEN_AQUI` | Instance Token |

### ⚠️ IMPORTANTE:

- **NÃO** use as credenciais antigas que estavam no código
- **Gere novas credenciais** no painel Evolution API
- Veja o arquivo: `src/🔐_ROTACIONAR_CREDENCIAIS_EVOLUTION_AGORA_v1.0.103.317.md`

---

## ✅ Passo 5: Verificar Configuração

### 📝 Script de Verificação:

```sql
-- ============================================================================
-- SCRIPT DE VERIFICAÇÃO - Verificar se todas as tabelas foram criadas
-- ============================================================================

-- 1. Verificar se tabela KV Store existe
SELECT 
  'kv_store_67caf26a' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kv_store_67caf26a')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  (SELECT COUNT(*) FROM kv_store_67caf26a) AS total_registros
UNION ALL

-- 2. Verificar se tabela Channel Config existe
SELECT 
  'organization_channel_config' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_channel_config')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  (SELECT COUNT(*) FROM organization_channel_config) AS total_registros
UNION ALL

-- 3. Verificar se tabela Evolution Instances existe
SELECT 
  'evolution_instances' AS tabela,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evolution_instances')
    THEN '✅ Existe'
    ELSE '❌ Não existe'
  END AS status,
  (SELECT COUNT(*) FROM evolution_instances) AS total_registros;

-- 4. Verificar instância do superadmin
SELECT 
  user_id,
  instance_name,
  base_url,
  CASE 
    WHEN instance_api_key IS NOT NULL AND LENGTH(instance_api_key) > 0 
    THEN '✅ Configurado'
    ELSE '❌ Não configurado'
  END AS status_credenciais,
  created_at
FROM evolution_instances
WHERE user_id = 1;
```

### ✅ Como Executar:

1. No **SQL Editor**, clique em **+ New query**
2. Cole o script de verificação acima
3. Clique em **RUN**
4. Verifique se todas as tabelas aparecem como **✅ Existe**

---

## 📋 Checklist Final

Marque cada item após concluir:

### Tabelas Criadas:
- [ ] ✅ Tabela `kv_store_67caf26a` criada
- [ ] ✅ Tabela `organization_channel_config` criada
- [ ] ✅ Tabela `evolution_instances` criada
- [ ] ✅ Índices criados em todas as tabelas
- [ ] ✅ Triggers criados (updated_at automático)
- [ ] ✅ RLS habilitado nas tabelas necessárias

### Configurações:
- [ ] ✅ Instância do superadmin inserida na tabela `evolution_instances`
- [ ] ✅ Secrets configurados no Supabase (Edge Functions → Secrets)
  - [ ] `EVOLUTION_API_URL`
  - [ ] `EVOLUTION_INSTANCE_NAME`
  - [ ] `EVOLUTION_GLOBAL_API_KEY`
  - [ ] `EVOLUTION_INSTANCE_TOKEN`

### Verificações:
- [ ] ✅ Script de verificação executado com sucesso
- [ ] ✅ Todas as tabelas aparecem como "✅ Existe"
- [ ] ✅ Instância do superadmin configurada corretamente

### Próximos Passos:
- [ ] ⏭️ Fazer deploy da Edge Function `rendizy-server`
- [ ] ⏭️ Testar conexão com Evolution API
- [ ] ⏭️ Testar criação de imóvel no sistema

---

## 🔍 Troubleshooting

### Erro: "relation does not exist"

**Causa:** Tabela não foi criada.

**Solução:**
1. Execute novamente o script SQL da tabela que está faltando
2. Verifique se não há erros de sintaxe
3. Verifique se você está no projeto correto (`odcgnzfremrqnvtitpcc`)

### Erro: "duplicate key value violates unique constraint"

**Causa:** Tabela já existe ou registro duplicado.

**Solução:**
- Se a tabela já existe, está tudo certo! O `CREATE TABLE IF NOT EXISTS` não faz nada.
- Se é registro duplicado, use `ON CONFLICT DO NOTHING` (já está no script)

### Erro: "permission denied"

**Causa:** Sem permissão para criar tabelas.

**Solução:**
- Verifique se você está logado como owner do projeto
- Verifique se está no projeto correto

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do SQL Editor:**
   - Veja a aba "Results" após executar o script
   - Procure por mensagens de erro em vermelho

2. **Verificar tabelas criadas:**
   - Vá em **Table Editor** (menu lateral)
   - Veja se as tabelas aparecem na lista

3. **Verificar secrets:**
   - Vá em **Settings** → **Edge Functions** → **Secrets**
   - Veja se todas as variáveis estão configuradas

---

## 📚 Documentação Relacionada

- **Deploy Supabase:** `DEPLOY_SUPABASE.md`
- **Multi-Tenant:** `MULTI_TENANT_README.md`
- **Rotação de Credenciais:** `src/🔐_ROTACIONAR_CREDENCIAIS_EVOLUTION_AGORA_v1.0.103.317.md`

---

**Projeto:** Rendizy  
**Database:** odcgnzfremrqnvtitpcc  
**URL:** https://odcgnzfremrqnvtitpcc.supabase.co  
**Status:** ⏳ Aguardando configuração

