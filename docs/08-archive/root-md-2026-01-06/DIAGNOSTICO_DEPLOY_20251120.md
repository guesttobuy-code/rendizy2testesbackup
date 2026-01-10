# 🔍 Diagnóstico Deploy - 20/11/2025

## 📋 Status Atual

### ✅ Configurações Corretas Verificadas:

1. **GitHub Remote:**
   - ✅ Conectado: `guesttobuy-code/Rendizyoficial`
   - ✅ Token: Configurado (não exposto)

2. **Supabase CLI:**
   - ✅ Projeto linkado: `odcgnzfremrqnvtitpcc` (marcado com ●)
   - ✅ Token: `sbp_1c0b41c941ac6c1c584ce47be4f2afc2a99ef12b`
   - ✅ Acesso ao projeto confirmado na listagem

3. **Código:**
   - ✅ Project ID: `odcgnzfremrqnvtitpcc` (correto em `src/utils/supabase/info.tsx`)
   - ✅ URLs: Todas apontando para o projeto correto

## ❌ Problema Identificado

**Erro:** `TLS handshake timeout` durante deploy

**Causas Possíveis:**
1. **Problema de rede/conexão** (mais provável)
2. **Token expirado ou sem permissão** (menos provável, mas possível)
3. **Projeto não acessível** (improvável, pois listagem funciona)

## 🔧 Soluções a Tentar

### SOLUÇÃO 1: Tentar Novamente (Timeout de Rede)

O erro `TLS handshake timeout` geralmente é um problema temporário de rede. Tente:

```powershell
# Tentar deploy novamente
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

**Aguardar:** Pode levar alguns minutos se a rede estiver lenta

---

### SOLUÇÃO 2: Verificar Token (Se Solução 1 não funcionar)

O token pode estar sem permissão para deploy. Verificar:

1. **Acesse:** https://supabase.com/dashboard/account/tokens
2. **Verifique:** Se o token `sbp_1c0b41c941ac6c1c584ce47be4f2afc2a99ef12b` está ativo
3. **Crie novo token** se necessário:
   - Nome: "Deploy CLI"
   - Permissões: Full access
   - Copie o novo token
   - Use no deploy: `$env:SUPABASE_ACCESS_TOKEN = "NOVO_TOKEN"`

---

### SOLUÇÃO 3: Verificar Permissões do Projeto

1. **Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
2. **Verifique:** Se a conta tem permissão de **Owner** ou **Admin**
3. **Verifique:** Se há alguma restrição de rede/IP

---

### SOLUÇÃO 4: Deploy via Dashboard (Alternativa)

Se o CLI continuar falhando, fazer deploy manual via Dashboard:

1. **Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions
2. **Clique:** `rendizy-server` → `Update Function`
3. **Faça upload do ZIP:**
   - `C:\Users\rafae\Downloads\rendizy-server-deploy-20251120-211414.zip`
4. **Aguarde:** Deploy finalizar (1-2 minutos)

**⚠️ NOTA:** O Supabase Dashboard geralmente não aceita ZIP direto. Pode ser necessário usar outro método.

---

### SOLUÇÃO 5: Deploy via Git Push (Se configurado)

Se o Supabase está conectado ao GitHub via Git Push automático:

1. **Commit as alterações:**
   ```powershell
   git add supabase/functions/rendizy-server/
   git commit -m "fix: Adicionar logs de debug no CORS"
   git push origin main
   ```

2. **Aguardar:** Supabase detectar push e fazer deploy automático

**Verificar:** Se há integração Git configurada no Dashboard → Settings → Integrations

---

## 📊 Informações Coletadas

### Projeto Supabase:
- **Project ID:** `odcgnzfremrqnvtitpcc`
- **Nome:** `Rendizy2producao`
- **Região:** South America (São Paulo)
- **Status:** Linkado (●)

### GitHub:
- **Repositório:** `guesttobuy-code/Rendizyoficial`
- **Status:** Conectado

### Alterações Feitas:
- ✅ Logs de debug no CORS adicionados
- ✅ Configuração CORS mantida (origem específica + credentials: true)
- ✅ Arquivo modificado: `supabase/functions/rendizy-server/index.ts`

---

## 🎯 Próximos Passos

1. **Tentar deploy novamente** (solução mais rápida)
2. **Se falhar:** Verificar token/permissões
3. **Se continuar falhando:** Verificar integração Git ou usar Dashboard

---

**Versão:** v1.0.103.983+  
**Data:** 20/11/2025

