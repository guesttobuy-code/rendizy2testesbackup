# 🚀 APLICAR PLANO DE CONTAS - MÉTODO DIRETO

**Data:** 25/11/2025  
**Status:** ⚠️ **APLICAR AGORA**

---

## 📋 INSTRUÇÕES RÁPIDAS

### **1. Acessar SQL Editor do Supabase**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Faça login se necessário

### **2. Copiar e Colar o SQL**

1. Abra o arquivo: `supabase/migrations/20241124_plano_contas_imobiliaria_temporada.sql`
2. Selecione **TODO** o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. Cole no SQL Editor do Supabase (Ctrl+V)

### **3. Executar**

1. Clique em **"Run"** ou pressione **Ctrl+Enter**
2. Aguarde alguns segundos
3. Deve aparecer: ✅ **Success**

### **4. Verificar**

Execute esta query para verificar:

```sql
SELECT COUNT(*) as total_categorias, 
       COUNT(DISTINCT organization_id) as organizacoes
FROM financeiro_categorias;
```

**Resultado esperado:**
- Deve retornar aproximadamente **84 categorias por organização**

---

## ✅ APÓS APLICAR

1. ✅ Recarregue a página de Plano de Contas no localhost: http://localhost:3000/financeiro/plano-contas
2. ✅ As categorias devem aparecer na tela
3. ✅ Estrutura hierárquica completa (3.x, 4.x, 5.x, 6.x, 7.x)

---

## 📊 O QUE SERÁ CRIADO

- **~84 categorias** por organização
- **Estrutura hierárquica completa**
- **Receitas e despesas organizadas**
- **Todas as OTAs cobertas**

---

## ⚠️ IMPORTANTE

- ✅ O script é **idempotente** - pode ser executado múltiplas vezes
- ✅ Não cria duplicatas (usa `ON CONFLICT DO NOTHING`)
- ✅ Aplica para **TODAS as organizações** automaticamente

---

**Status:** ⚠️ **Aguardando aplicação manual no SQL Editor**

