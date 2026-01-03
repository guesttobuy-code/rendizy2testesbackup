# 🔐 ROTACIONAR CREDENCIAIS EVOLUTION API - URGENTE

**Versão:** v1.0.103.317  
**Data:** 05/11/2025  
**Prioridade:** 🔴 CRÍTICA

---

## 🚨 SITUAÇÃO ATUAL

As credenciais da Evolution API estavam **expostas no código-fonte** até a versão v1.0.103.316:

```typescript
// ❌ CÓDIGO ANTIGO (INSEGURO):
const EVOLUTION_GLOBAL_API_KEY = Deno.env.get('EVOLUTION_GLOBAL_API_KEY') || '4de7861e944e291b56fe9781d2b00b36';
const EVOLUTION_INSTANCE_TOKEN = Deno.env.get('EVOLUTION_INSTANCE_TOKEN') || '0FF3641E80A6-453C-AB4E-28C2F2D01C50';
```

**Risco:**
- Qualquer pessoa com acesso ao repositório pode enviar mensagens pelo WhatsApp Rendizy
- Acesso a todos os contatos e conversas
- Possibilidade de exclusão de dados

---

## ✅ O QUE JÁ FOI CORRIGIDO (v1.0.103.317)

### 1. **Credenciais removidas do código**

```typescript
// ✅ CÓDIGO NOVO (SEGURO):
const EVOLUTION_GLOBAL_API_KEY = Deno.env.get('EVOLUTION_GLOBAL_API_KEY');

if (!EVOLUTION_GLOBAL_API_KEY) {
  throw new Error('🔴 EVOLUTION_GLOBAL_API_KEY não configurada!');
}
```

### 2. **Headers corrigidos**

```typescript
// ✅ Headers corretos para /manager endpoints:
function getEvolutionManagerHeaders() {
  return {
    'apikey': EVOLUTION_GLOBAL_API_KEY,
    'instanceToken': EVOLUTION_INSTANCE_TOKEN,
    'Content-Type': 'application/json',
  };
}

// ✅ Headers corretos para mensagens:
function getEvolutionMessagesHeaders() {
  return {
    'apikey': EVOLUTION_GLOBAL_API_KEY,
    'instanceToken': EVOLUTION_INSTANCE_TOKEN, // Para instâncias seguras
    'Content-Type': 'application/json',
  };
}
```

### 3. **Base URL normalizada**

```typescript
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, ''); // Remove barras finais
}
```

---

## 🔥 AÇÃO IMEDIATA OBRIGATÓRIA

### PASSO 1: Rotacionar Credenciais Evolution API

**Você DEVE fazer isso AGORA para garantir segurança:**

1. **Acessar Painel Evolution API**
   ```
   URL: https://evo.boravendermuito.com.br
   Login: [Suas credenciais de admin]
   ```

2. **Gerar Novas Credenciais**
   
   #### Global API Key:
   ```
   1. Ir em: Configurações → API Keys
   2. Clicar em: "Gerar Nova API Key"
   3. Copiar a nova key
   4. ANOTAR EM LOCAL SEGURO
   ```

   #### Instance Token:
   ```
   1. Ir em: Instâncias → Rendizy
   2. Clicar em: "Regenerar Token"
   3. Copiar o novo token
   4. ANOTAR EM LOCAL SEGURO
   ```

3. **Revogar Credenciais Antigas**
   ```
   ❌ REVOGAR: 4de7861e944e291b56fe9781d2b00b36 (Global API Key)
   ❌ REVOGAR: 0FF3641E80A6-453C-AB4E-28C2F2D01C50 (Instance Token)
   ```

---

### PASSO 2: Configurar Novas Credenciais no Sistema

**Opção A: Via Supabase Dashboard (RECOMENDADO)**

```
1. Acessar: https://supabase.com/dashboard
2. Projeto: RENDIZY
3. Settings → Edge Functions → Secrets
4. Adicionar/Atualizar:
   - EVOLUTION_API_URL = https://evo.boravendermuito.com.br
   - EVOLUTION_INSTANCE_NAME = Rendizy
   - EVOLUTION_GLOBAL_API_KEY = <NOVA_KEY_GERADA>
   - EVOLUTION_INSTANCE_TOKEN = <NOVO_TOKEN_GERADO>
```

**Opção B: Via Terminal (Supabase CLI)**

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link com projeto
supabase link --project-ref <SEU_PROJECT_ID>

# Configurar secrets
supabase secrets set EVOLUTION_API_URL=https://evo.boravendermuito.com.br
supabase secrets set EVOLUTION_INSTANCE_NAME=Rendizy
supabase secrets set EVOLUTION_GLOBAL_API_KEY=<NOVA_KEY>
supabase secrets set EVOLUTION_INSTANCE_TOKEN=<NOVO_TOKEN>

# Verificar
supabase secrets list
```

**Opção C: Via Arquivo .env Local (APENAS DESENVOLVIMENTO)**

```bash
# Criar arquivo .env na raiz do projeto
cat > .env << EOF
EVOLUTION_API_URL=https://evo.boravendermuito.com.br
EVOLUTION_INSTANCE_NAME=Rendizy
EVOLUTION_GLOBAL_API_KEY=<NOVA_KEY>
EVOLUTION_INSTANCE_TOKEN=<NOVO_TOKEN>
EOF

# ⚠️ NUNCA commitar .env no git!
echo ".env" >> .gitignore
```

---

### PASSO 3: Testar Conexão

**Teste via cURL:**

```bash
# Testar connectionState (endpoint /manager)
curl -s -D - \
  -H "apikey: <SUA_NOVA_GLOBAL_API_KEY>" \
  -H "instanceToken: <SEU_NOVO_INSTANCE_TOKEN>" \
  "https://evo.boravendermuito.com.br/manager/instance/connectionState/Rendizy"

# Resultado esperado:
# HTTP/1.1 200 OK
# {
#   "instance": {
#     "state": "open",
#     "instanceName": "Rendizy"
#   }
# }
```

**Teste via Interface:**

```
1. Acessar: /chat (módulo de chat do sistema)
2. Verificar status: Deve mostrar "Conectado"
3. Tentar enviar mensagem de teste
4. Verificar se mensagem foi enviada
```

---

### PASSO 4: Redeploy da Aplicação

```bash
# Se estiver usando Supabase Edge Functions
supabase functions deploy server

# Se estiver usando Vercel/Netlify
# Push para git dispara deploy automático:
git add .
git commit -m "🔐 Security: Update Evolution API credentials"
git push origin main

# Aguardar deploy (2-3 minutos)
# Verificar logs de deploy
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Antes de Considerar Concluído:

- [ ] **Novas credenciais geradas** no painel Evolution API
- [ ] **Credenciais antigas revogadas** no painel Evolution API
- [ ] **Novas credenciais configuradas** nas variáveis de ambiente
- [ ] **Teste cURL retorna 200 OK** (não 403 Forbidden)
- [ ] **Teste via interface funciona** (chat conectado)
- [ ] **Deploy realizado** com sucesso
- [ ] **Logs do servidor sem erros** de "env var não configurada"
- [ ] **Arquivo .env NÃO está no git** (.gitignore configurado)

---

## 🔍 TROUBLESHOOTING

### Erro: "EVOLUTION_GLOBAL_API_KEY não configurada!"

**Causa:** Variável de ambiente não foi configurada.

**Solução:**
```bash
# Verificar se variável existe:
supabase secrets list

# Se não existir, adicionar:
supabase secrets set EVOLUTION_GLOBAL_API_KEY=<SUA_NOVA_KEY>

# Redeploy:
supabase functions deploy server
```

---

### Erro: 403 Forbidden ao testar connectionState

**Causa:** Headers incorretos ou credenciais inválidas.

**Solução:**

```bash
# Testar com AMBOS headers:
curl -s -D - \
  -H "apikey: <GLOBAL_API_KEY>" \
  -H "instanceToken: <INSTANCE_TOKEN>" \
  "https://evo.boravendermuito.com.br/manager/instance/connectionState/Rendizy"

# NÃO usar:
# -H "Authorization: Bearer <TOKEN>"  # ❌ ERRADO para /manager
```

---

### Erro: "normalizeBaseUrl is not defined"

**Causa:** Código antigo em cache.

**Solução:**
```bash
# Limpar cache do navegador:
Ctrl + Shift + Delete

# Hard refresh:
Ctrl + Shift + R

# Verificar versão no console:
# Deve aparecer: v1.0.103.317
```

---

## 🎯 RESUMO EXECUTIVO

### O que foi feito:

1. ✅ **Credenciais removidas do código-fonte** (linhas 25-28)
2. ✅ **Headers corrigidos** (apikey + instanceToken separados)
3. ✅ **Base URL normalizada** (remove barras duplicadas)
4. ✅ **Validação obrigatória** (throw error se não configurado)

### O que VOCÊ precisa fazer:

1. 🔴 **Rotacionar credenciais** no painel Evolution API
2. 🔴 **Configurar env vars** no Supabase/Vercel
3. 🔴 **Testar conexão** via cURL ou interface
4. 🔴 **Redeploy** da aplicação

### Tempo estimado:

- Rotacionar credenciais: **5 minutos**
- Configurar env vars: **5 minutos**
- Testar: **5 minutos**
- Redeploy: **3 minutos**
- **Total: ~20 minutos**

---

## ⚠️ AVISOS IMPORTANTES

### 🔴 NÃO FAZER:

- ❌ Compartilhar credenciais via Slack/Email/WhatsApp
- ❌ Commitar arquivo .env no git
- ❌ Colocar credenciais em comentários no código
- ❌ Usar credenciais antigas (já foram expostas)

### ✅ FAZER:

- ✅ Armazenar credenciais em gerenciador de senhas (1Password, LastPass)
- ✅ Usar variáveis de ambiente SEMPRE
- ✅ Rotacionar credenciais periodicamente (a cada 3 meses)
- ✅ Monitorar logs de acesso no painel Evolution

---

## 📞 SUPORTE

### Se encontrar problemas:

1. **Verificar logs do servidor:**
   ```bash
   # Supabase Edge Functions:
   supabase functions serve server
   
   # Vercel:
   vercel logs
   ```

2. **Verificar env vars:**
   ```bash
   supabase secrets list
   ```

3. **Verificar painel Evolution API:**
   ```
   https://evo.boravendermuito.com.br
   ```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **ChatGPT Feedback:** `/🚨_SUMARIO_EXECUTIVO_FEEDBACK_CHATGPT_v1.0.103.316.md`
- **Aprendizados Críticos:** `/⚡_APRENDIZADOS_CRITICOS_DIARIOS_v1.0.103.315.md`
- **Evolution API Docs:** [https://doc.evolution-api.com](https://doc.evolution-api.com)

---

**VERSÃO:** v1.0.103.317  
**CRIADO:** 05/11/2025  
**PRIORIDADE:** 🔴 CRÍTICA  
**PRAZO:** IMEDIATO (fazer HOJE)  
**STATUS:** ⏳ Aguardando rotação de credenciais
