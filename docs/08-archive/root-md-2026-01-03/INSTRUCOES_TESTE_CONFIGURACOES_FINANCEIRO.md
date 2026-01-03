# 📋 INSTRUÇÕES PARA TESTAR CONFIGURAÇÕES DO FINANCEIRO

**Data:** 26/11/2025  
**Status:** ⚠️ Backend offline - Usando token temporário

---

## 🚨 **PROBLEMA ATUAL**

- ❌ Backend retornando **503 Service Unavailable**
- ❌ Login não funciona (backend offline)
- ✅ Frontend funcionando corretamente
- ✅ Script SQL criado para gerar token temporário

---

## 🔧 **SOLUÇÃO: TOKEN TEMPORÁRIO**

### **Passo 1: Criar Token no Supabase**

1. Acesse o Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
   ```

2. Abra o arquivo: `criar-token-temporario.sql`

3. Copie **TODO** o conteúdo do arquivo (Ctrl+A, Ctrl+C)

4. Cole no SQL Editor do Supabase (Ctrl+V)

5. Execute (Ctrl+Enter ou botão RUN)

6. **Copie o TOKEN** da coluna `token` do resultado

### **Passo 2: Usar Token no Navegador**

1. Abra o console do navegador (F12)

2. Execute:
   ```javascript
   localStorage.setItem('rendizy-token', 'TOKEN_AQUI')
   ```
   (Substitua `TOKEN_AQUI` pelo token copiado)

3. Recarregue a página (F5)

### **Passo 3: Navegar até Configurações do Financeiro**

1. Após recarregar, você deve estar logado

2. Navegue até:
   ```
   http://localhost:3000/financeiro/configuracoes
   ```

3. Ou clique em:
   - **Finanças** (menu lateral)
   - **Configurações do Financeiro** (submenu)

---

## 📝 **SCRIPT SQL CRIADO**

Arquivo: `criar-token-temporario.sql`

Este script:
- ✅ Limpa sessões antigas do admin
- ✅ Gera um token válido (128 caracteres)
- ✅ Cria sessão no banco de dados
- ✅ Retorna o token para uso

---

## 🔍 **FALHAS MAPEADAS**

Documento completo: `FALHAS_MAPEADAS_LOCALHOST.md`

### **Resumo:**
1. ❌ Backend offline (503)
2. ❌ Erro de CORS (preflight OPTIONS falhando)
3. ❌ Login falhando
4. ⚠️ Sistema em modo fallback

### **Correções Aplicadas:**
1. ✅ Removida importação duplicada em `routes-listings.ts`
2. ✅ Deploy realizado
3. ⏳ Aguardando inicialização do backend

---

## ⏳ **PRÓXIMOS PASSOS**

1. **Imediato:** Usar token temporário para testar
2. **Verificar:** Logs do Supabase para identificar problema do backend
3. **Corrigir:** Problema que está impedindo inicialização do backend
4. **Testar:** Login normal após backend estar online

---

**Última atualização:** 26/11/2025 00:55

