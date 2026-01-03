# ✅ CORREÇÃO - PLANO DE CONTAS

**Data:** 24/11/2025  
**Erro:** `null value in column "organization_id" violates not-null constraint`  
**Status:** ✅ **CORRIGIDO**

---

## 🐛 PROBLEMA

O script original tentava inserir categorias com `organization_id = NULL`, mas a tabela `financeiro_categorias` exige `organization_id NOT NULL`.

---

## ✅ SOLUÇÃO APLICADA

### **Criação de Função SQL:**
- ✅ Função `criar_plano_contas_para_organizacao(org_id UUID)` criada
- ✅ A função recebe um `organization_id` válido como parâmetro
- ✅ Todas as categorias são inseridas com o `organization_id` correto

### **Aplicação Automática:**
- ✅ O script aplica o plano de contas para **TODAS as organizações existentes**
- ✅ Usa um loop `FOR` para iterar sobre todas as organizações
- ✅ Cada organização recebe suas próprias 84 categorias

### **Idempotência:**
- ✅ Usa `ON CONFLICT (organization_id, codigo) DO NOTHING`
- ✅ Pode ser executado múltiplas vezes sem erro
- ✅ Não cria duplicatas

---

## 🚀 APLICAR AGORA

1. **Acesse:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. **Copie TODO o conteúdo** de `supabase/migrations/20241124_plano_contas_imobiliaria_temporada.sql` (já corrigido)
3. **Cole e execute** (Ctrl+Enter)
4. ✅ **Deve funcionar agora!**

---

## 📊 RESULTADO ESPERADO

Após executar o script:
- ✅ **84 categorias** criadas para cada organização existente
- ✅ Estrutura hierárquica completa
- ✅ Todas as OTAs cobertas
- ✅ Receitas e despesas organizadas

---

## 🔧 APLICAR EM UMA ORGANIZAÇÃO ESPECÍFICA

Se quiser aplicar apenas em uma organização específica:

```sql
SELECT criar_plano_contas_para_organizacao('UUID-DA-ORGANIZACAO');
```

---

**Commit:** `fix: corrigir plano de contas para usar organization_id válido (não NULL)`

