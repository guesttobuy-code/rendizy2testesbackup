# 🔄 Como Limpar Cache do Supabase e Garantir Código Alinhado

**Data:** 2025-11-30  
**Objetivo:** Garantir que o código em produção está alinhado com o código local

---

## 🎯 PROBLEMA

O Supabase Edge Functions pode manter código antigo em cache, causando erros como:
- Tentativa de usar KV Store para dados críticos (organizações, usuários, etc)
- Código antigo sendo executado mesmo após deploy
- Comportamento inconsistente entre local e produção

---

## ✅ SOLUÇÕES

### **1. Deploy Forçado (Recomendado)**

```bash
cd supabase
supabase functions deploy rendizy-server --no-verify-jwt
```

**O que faz:**
- Força recompilação do código
- Atualiza todas as dependências
- Limpa cache do Deno runtime

---

### **2. Deploy com Versão Específica**

```bash
cd supabase
supabase functions deploy rendizy-server --version 1.0.0
```

**O que faz:**
- Cria uma nova versão da função
- Garante que o código antigo não será usado
- Útil para rollback se necessário

---

### **3. Deletar e Recriar a Função**

```bash
# 1. Deletar função (via Dashboard ou CLI)
supabase functions delete rendizy-server

# 2. Recriar função
supabase functions deploy rendizy-server
```

**⚠️ CUIDADO:** Isso remove a função completamente. Use apenas se necessário.

---

### **4. Verificar Código em Produção**

Após deploy, verifique se o código está correto:

```bash
# Ver logs em tempo real
supabase functions logs rendizy-server --follow

# Ver versão atual
supabase functions list
```

---

## 🔍 VERIFICAÇÃO

### **1. Verificar se Código Antigo Foi Removido**

Após deploy, teste criando uma organização e verifique os logs:

```bash
supabase functions logs rendizy-server --follow
```

**Procure por:**
- ❌ `kv.set` ou `org:org_` → Código antigo ainda em cache
- ✅ Apenas logs de SQL → Código correto

---

### **2. Testar Criação de Organização**

Após deploy, teste criar uma organização via UI ou script:

```bash
python testar_criar_imobiliaria.py
```

**Se funcionar:** ✅ Cache limpo, código alinhado  
**Se der erro de KV Store:** ❌ Ainda há código antigo em cache

---

## 🚨 SE O PROBLEMA PERSISTIR

### **Opção 1: Verificar Código Local**

```bash
# Verificar se há código antigo no arquivo
grep -r "kv.set.*org:" supabase/functions/rendizy-server/
grep -r "org:org_" supabase/functions/rendizy-server/
```

**Se encontrar:** Remova o código antigo e faça deploy novamente.

---

### **Opção 2: Verificar Dependências**

```bash
# Verificar imports
grep -r "import.*kv" supabase/functions/rendizy-server/routes-organizations.ts
```

**Se encontrar import de `kv`:** Remova e use apenas SQL.

---

### **Opção 3: Limpar Cache do Deno Localmente**

```bash
# Limpar cache do Deno (se estiver usando localmente)
deno cache --reload supabase/functions/rendizy-server/index.ts
```

---

## 📋 CHECKLIST PÓS-DEPLOY

Após fazer deploy, verifique:

- [ ] ✅ Deploy foi bem-sucedido (sem erros)
- [ ] ✅ Logs mostram código novo sendo executado
- [ ] ✅ Teste de criação de organização funciona
- [ ] ✅ Não há erros de KV Store para dados críticos
- [ ] ✅ Código em produção está alinhado com código local

---

## 🎯 COMANDO RÁPIDO (TUDO EM UM)

```bash
# 1. Verificar código local (não deve ter kv.set para org)
grep -r "kv.set.*org:" supabase/functions/rendizy-server/routes-organizations.ts || echo "✅ Código limpo"

# 2. Fazer deploy forçado
cd supabase && supabase functions deploy rendizy-server --no-verify-jwt

# 3. Verificar logs
supabase functions logs rendizy-server --follow
```

---

## 💡 DICA IMPORTANTE

**Sempre após modificar código crítico:**
1. ✅ Verificar que código antigo foi removido
2. ✅ Fazer deploy forçado
3. ✅ Testar imediatamente após deploy
4. ✅ Verificar logs para confirmar que código novo está rodando

---

**Última atualização:** 2025-11-30
