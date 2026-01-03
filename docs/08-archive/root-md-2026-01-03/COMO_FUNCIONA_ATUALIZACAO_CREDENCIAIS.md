# 🔄 Como Funciona a Atualização Dinâmica de Credenciais

**Data:** 15/11/2025  
**Versão:** 1.0

---

## 🎯 Resposta Direta

**Você NÃO precisa alterar manualmente no Supabase todos os dias!**

O sistema Rendizy já permite atualizar credenciais dinamicamente via:
1. ✅ **Interface do Sistema** (mais fácil)
2. ✅ **API REST** (para integrações)
3. ✅ **Banco de Dados** (tabela `evolution_instances`)

Os **Secrets do Supabase** são apenas um **fallback de segurança** (última opção).

---

## 📊 Ordem de Prioridade (Como o Sistema Busca Credenciais)

O sistema busca credenciais nesta ordem:

```
1️⃣ PRIMEIRO: Tabela evolution_instances (banco de dados)
   └─> Credenciais do usuário específico (user_id)
   
2️⃣ SEGUNDO: Tabela evolution_instances (banco de dados)
   └─> Credenciais do superadmin (user_id = 1)
   
3️⃣ TERCEIRO: Secrets do Supabase (variáveis de ambiente)
   └─> EVOLUTION_INSTANCE_NAME, EVOLUTION_INSTANCE_TOKEN, etc.
   └─> ⚠️ Apenas como FALLBACK (se não encontrar no banco)
```

---

## 🖥️ Opção 1: Atualizar via Interface do Sistema (RECOMENDADO)

### Onde fazer:

1. **Acesse o sistema Rendizy:**
   - URL: http://localhost:3000 (ou sua URL de produção)

2. **Vá em Configurações:**
   - Menu lateral → **Configurações**
   - Ou: **Configurações → Integrações → WhatsApp**

3. **Edite as credenciais:**
   - Nome da Instância
   - Instance Token
   - Global API Key
   - URL da Evolution API

4. **Clique em "Salvar Configurações"**

### O que acontece:

- ✅ Salva na tabela `organization_channel_config` (configuração da organização)
- ✅ Salva na tabela `evolution_instances` (credenciais do usuário)
- ✅ **Atualização imediata** - não precisa reiniciar nada
- ✅ **Não precisa mexer no Supabase**

---

## 🔌 Opção 2: Atualizar via API REST

### Endpoint:

```
POST https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/chat/evolution/instance
```

### Exemplo de Requisição:

```bash
curl -X POST "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/chat/evolution/instance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "user_id": 1,
    "instance_name": "Rafael Rendizy Google teste",
    "instance_api_key": "D34790BEB178-4054-A6C2-F76445A81747",
    "global_api_key": "SUA_GLOBAL_API_KEY",
    "base_url": "https://evo.boravendermuito.com.br"
  }'
```

### O que acontece:

- ✅ Faz **UPSERT** (insert or update) na tabela `evolution_instances`
- ✅ Se o `user_id` já existe, **atualiza** os dados
- ✅ Se não existe, **cria** novo registro
- ✅ **Atualização imediata**

---

## 🗄️ Opção 3: Atualizar via SQL (Apenas para Emergências)

### Quando usar:

- ⚠️ Apenas se a interface ou API não funcionarem
- ⚠️ Para correções rápidas
- ⚠️ Para testes

### Script SQL:

```sql
-- Atualizar credenciais do superadmin (user_id = 1)
UPDATE evolution_instances
SET 
  instance_name = 'Rafael Rendizy Google teste',
  instance_api_key = 'D34790BEB178-4054-A6C2-F76445A81747',
  global_api_key = 'SUA_GLOBAL_API_KEY',
  base_url = 'https://evo.boravendermuito.com.br',
  updated_at = NOW()
WHERE user_id = 1;
```

---

## 🔐 Quando Atualizar os Secrets do Supabase?

### Você DEVE atualizar os Secrets apenas quando:

1. ✅ **Primeira configuração** (setup inicial)
2. ✅ **Mudança de servidor Evolution API** (nova URL)
3. ✅ **Rotação de segurança** (gerar novas credenciais)
4. ✅ **Fallback de emergência** (se o banco estiver offline)

### Você NÃO precisa atualizar os Secrets quando:

- ❌ Mudar nome da instância (faz via interface)
- ❌ Regenerar Instance Token (faz via interface)
- ❌ Atualizar credenciais de um usuário específico (faz via interface)
- ❌ Mudanças diárias/rotineiras (faz via interface)

---

## 📋 Resumo: Fluxo de Atualização Diária

### Cenário: Você precisa mudar o Instance Token

**❌ NÃO FAZER:**
- Ir no Supabase → Secrets → Editar `EVOLUTION_INSTANCE_TOKEN`

**✅ FAZER:**
1. Abrir sistema Rendizy
2. Ir em **Configurações → Integrações → WhatsApp**
3. Editar o campo "Instance Token"
4. Clicar em "Salvar"
5. **Pronto!** Sistema atualizado automaticamente

---

## 🎯 Exemplo Prático

### Situação: Token da instância expirado, precisa regenerar

**Passo 1:** Regenerar token no Evolution API
- Acessar: https://evo.boravendermuito.com.br
- Ir em: Instâncias → Rendizy → Regenerar Token
- Copiar novo token

**Passo 2:** Atualizar no sistema Rendizy
- Abrir: http://localhost:3000/settings
- Editar: Instance Token
- Colar: Novo token
- Salvar

**Passo 3:** Pronto!
- ✅ Sistema usa novo token imediatamente
- ✅ Salvo na tabela `evolution_instances`
- ✅ Não precisa mexer no Supabase

---

## 🔍 Como Verificar Qual Credencial Está Sendo Usada

O sistema loga qual fonte está usando:

```
✅ [Evolution] Credenciais encontradas para user_id: 1
   → Usando: Tabela evolution_instances (banco de dados)

✅ [Evolution] Usando credenciais do superadmin (user_id: 1)
   → Usando: Tabela evolution_instances (superadmin)

⚠️ [Evolution] Superadmin sem credenciais, usando variáveis de ambiente
   → Usando: Secrets do Supabase (fallback)
```

---

## 📊 Tabela Comparativa

| Método | Quando Usar | Facilidade | Atualização |
|--------|-------------|------------|-------------|
| **Interface do Sistema** | Uso diário | ⭐⭐⭐⭐⭐ Muito fácil | ✅ Imediata |
| **API REST** | Integrações/automação | ⭐⭐⭐ Média | ✅ Imediata |
| **SQL Direto** | Emergências | ⭐⭐ Difícil | ✅ Imediata |
| **Secrets Supabase** | Setup inicial/fallback | ⭐⭐⭐ Média | ⚠️ Requer redeploy |

---

## ✅ Conclusão

**Para uso diário:**
- ✅ Use a **Interface do Sistema** (Configurações → WhatsApp)
- ✅ Não precisa mexer no Supabase
- ✅ Atualização automática e imediata

**Secrets do Supabase:**
- ✅ Apenas para **setup inicial** e **fallback de segurança**
- ✅ Não precisa atualizar todos os dias
- ✅ Serve como backup se o banco falhar

---

## 🎓 Resumo Executivo

**Pergunta:** "Se algum dado precisar ser alterado, vou alterar no sistema Rendizy e você vai alterar no Supabase também?"

**Resposta:** 
- ✅ **Você altera no sistema Rendizy** (via interface)
- ❌ **EU NÃO preciso alterar no Supabase** (só se você quiser atualizar o fallback)
- ✅ **O sistema atualiza automaticamente** na tabela `evolution_instances`
- ✅ **Funciona imediatamente** sem precisar mexer em nada

**Os Secrets do Supabase são apenas um backup/fallback!**

---

**Sistema:** Rendizy  
**Versão:** 1.0.103.322+  
**Status:** ✅ Sistema dinâmico funcionando

