# 🔍 ANÁLISE: Erro "Base price must be greater than 0"

**Data:** 02/12/2025  
**Status:** ⚠️ Problema identificado

---

## 🐛 PROBLEMA

O backend está retornando erro:
```
"Base price must be greater than 0"
```

Mas essa mensagem **NÃO está no código atual**!

---

## 🔍 DIAGNÓSTICO

### **1. Mensagem não encontrada no código:**
- ✅ Busquei em todo o código: `grep -r "Base price must be greater than 0"`
- ❌ **Não encontrada!**

### **2. Possíveis causas:**
1. **Versão antiga deployada** - O código no Supabase não está atualizado
2. **Validação em outro lugar** - Pode estar em `normalizeWizardData` ou `propertyToSql`
3. **Constraint do banco** - Pode haver uma constraint CHECK no PostgreSQL

### **3. Backend não está entrando em `createDraftPropertyMinimal`:**
- Pelos logs do usuário, **não vejo** o log:
  - `"🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro (PRIORIDADE)"`
- Isso significa que `willCreateMinimal` está `false`
- Ou seja: `isDraft = false` OU `hasId = true`

---

## ✅ CORREÇÕES APLICADAS

### **1. Backend - Logs de Debug:**
- ✅ Adicionados logs detalhados para rastrear `willCreateMinimal`
- ✅ Logs mostram `status`, `statusValue`, `isDraft`, `hasId`

### **2. Backend - Garantir que rascunhos não validem basePrice:**
- ✅ Adicionado log: `"✅ [createProperty] RASCUNHO - Pulando validações de basePrice"`
- ✅ Comentário explícito: `"NÃO validar basePrice para rascunhos"`

### **3. Deploy:**
- ✅ Código commitado e deployado novamente

---

## 🧪 PRÓXIMO PASSO

**Testar novamente e verificar logs do backend no Supabase Dashboard:**
- Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs
- Procure por: `"🔍 [createProperty] Verificação de rascunho"`
- Verifique se `willCreateMinimal` está `true` ou `false`
- Verifique se há o log `"🆕 [createProperty] Rascunho sem ID"`

---

**Se o problema persistir, os logs do backend mostrarão exatamente onde está falhando.**
