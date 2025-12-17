# 🚀 Deploy Supabase - Guia Completo

Este guia mostra como fazer deploy do backend e banco de dados no Supabase.

## 📋 Pré-requisitos

1. Conta no Supabase: https://supabase.com
2. Supabase CLI instalado (opcional, mas recomendado)
3. Acesso ao projeto: `odcgnzfremrqnvtitpcc`

## 🗄️ Passo 1: Criar Tabela no Banco de Dados

### Opção A: Via Dashboard do Supabase (Mais Fácil)

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc

2. Vá em **SQL Editor** (menu lateral esquerdo)

3. Clique em **+ New query**

4. **Execute 2 arquivos SQL na ordem:**

   **🔹 SQL 1 - Configurações de Canais:**
   - Copie: `supabase/migrations/20241112_create_channel_config.sql`
   - Cole no SQL Editor
   - Clique em **RUN** (Ctrl+Enter)
   - Aguarde: **Success. No rows returned**

   **🔹 SQL 2 - Instâncias Evolution (Multi-Tenant):**
   - Clique em **+ New query**
   - Copie: `supabase/migrations/20241112_create_evolution_instances.sql`
   - Cole no SQL Editor
   - Clique em **RUN** (Ctrl+Enter)
   - Aguarde: **Success. 1 row(s) returned** (cria instância superadmin)

5. **Verificar se criou:**
   - Vá em **Table Editor** (menu lateral)
   - Veja as tabelas:
     - ✅ `organization_channel_config`
     - ✅ `evolution_instances` (deve ter 1 linha - superadmin)

### Opção B: Via Supabase CLI (Avançado)

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login
supabase login

# Link com o projeto
supabase link --project-ref odcgnzfremrqnvtitpcc

# Executar migration
supabase db push
```

## ⚙️ Passo 2: Deploy da Edge Function

### Via Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions

2. Clique em **Deploy a new function**

3. Preencha:
   - **Name:** `rendizy-server`
   - **Method:** Import from local project

4. Faça upload da pasta:
   ```
   supabase/functions/rendizy-server/
   ```

   **Arquivos necessários:**
   - `index.ts`
   - `routes-chat.ts`
   - `routes-*.ts` (todos os outros)
   - `kv_store.tsx`
   - `types.ts`
   - `utils.ts`

5. Clique em **Deploy**

6. Aguarde o deploy finalizar (1-2 minutos)

### Via Supabase CLI (Recomendado)

```bash
# Navegar até a raiz do projeto
cd "D:\Projetos\Rendizy - Figma\Rendizy2"

# Fazer deploy
supabase functions deploy rendizy-server

# Aguarde...
# ✅ Deployed function rendizy-server
```

## 🧪 Passo 3: Testar o Backend

Após o deploy, teste se está funcionando:

### Teste 1: Health Check

```bash
curl https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-12T...",
  "service": "Rendizy Backend API"
}
```

### Teste 2: Endpoint de Configuração

Via PowerShell:

```powershell
$headers = @{
  "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/channels/config?organization_id=org_default" -Headers $headers -Method Get
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "organization_id": "org_default",
    "whatsapp": {...},
    ...
  }
}
```

## ✅ Verificar se Funcionou

1. Acesse a aplicação: http://localhost:3000

2. Vá em **Configurações → Integrações → WhatsApp**

3. Preencha os dados e clique em **Salvar Configurações**

4. **Deve aparecer:** "✅ Configurações salvas no servidor!"

5. Verifique no banco de dados:
   - Dashboard → **Table Editor**
   - Selecione tabela: `organization_channel_config`
   - Veja os dados salvos

## 🔍 Troubleshooting

### Erro: "404 Not Found"
- ❌ Edge Function não foi deployada
- ✅ Execute o Passo 2 novamente

### Erro: "relation does not exist"
- ❌ Tabela não foi criada
- ✅ Execute o Passo 1 novamente

### Erro: "Invalid API key"
- ❌ Credenciais incorretas
- ✅ Verifique a API Key em `src/utils/supabase/info.tsx`

## 📝 Notas Importantes

- ⚠️ O deploy da Edge Function pode levar 1-2 minutos
- ⚠️ Após o deploy, aguarde 30 segundos antes de testar
- ⚠️ Limpe o cache do navegador após o deploy (Ctrl+Shift+R)
- ✅ Os dados ficam persistidos permanentemente no Supabase
- ✅ Não usa localStorage, tudo no banco real

## 🏢 Sistema Multi-Tenant Evolution API

O sistema agora suporta **múltiplas instâncias Evolution** por usuário!

### Como Funciona

1. **Cada usuário pode ter suas próprias credenciais:**
   - `instance_name` (ex: TESTE, PRODUCAO)
   - `instance_api_key` (token da instância)
   - `global_api_key` (API key global)
   - `base_url` (URL da Evolution API)

2. **Prioridade de credenciais:**
   ```
   1º → Credenciais do usuário (tabela evolution_instances)
   2º → Credenciais do superadmin (user_id = 1)
   3º → Variáveis de ambiente (.env) - fallback final
   ```

3. **Benefícios:**
   - ✅ Isolamento: cada cliente usa sua própria instância WhatsApp
   - ✅ Escalabilidade: suporta milhares de usuários
   - ✅ Segurança: RLS impede acesso cruzado
   - ✅ Fallback: sempre funciona (usa superadmin se necessário)

### Configurar Credenciais por Usuário

**Via API:**
```bash
curl -X POST "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/evolution/instance" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "instance_name": "PRODUCAO",
    "instance_api_key": "ABC123...",
    "global_api_key": "XYZ789...",
    "base_url": "https://evo.example.com"
  }'
```

**Via SQL (no dashboard):**
```sql
INSERT INTO evolution_instances 
  (user_id, instance_name, instance_api_key, global_api_key, base_url)
VALUES 
  (5, 'PRODUCAO', 'ABC123...', 'XYZ789...', 'https://evo.example.com');
```

### Documentação Completa

Veja: `supabase/functions/rendizy-server/MULTI_TENANT_EXAMPLE.md`

---

## 🎯 Próximos Passos

Após deploy bem-sucedido:

1. ✅ Configurar WhatsApp Evolution API
2. ✅ Testar conexão
3. ✅ Salvar configurações
4. ✅ Verificar dados no banco
5. ✅ (Opcional) Configurar credenciais por usuário

---

**Projeto:** Rendizy  
**Database:** odcgnzfremrqnvtitpcc  
**URL:** https://odcgnzfremrqnvtitpcc.supabase.co  
**Sistema:** Multi-Tenant Evolution API ✅

