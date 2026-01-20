# 🚀 APLICAR PLANO DE CONTAS - INSTRUÇÕES RÁPIDAS

**Data:** 25/11/2025  
**Status:** ⚠️ **APLICAR AGORA**

---

## 📋 INSTRUÇÕES

### **1. Acessar SQL Editor do Supabase**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql/new
2. Faça login se necessário

### **2. Copiar Migration**

1. Abra o arquivo: `supabase/migrations/20241124_plano_contas_imobiliaria_temporada.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### **3. Aplicar Migration**

1. Cole o conteúdo no SQL Editor do Supabase
2. Clique em **"Run"** ou pressione **Ctrl+Enter**
3. Aguarde a execução (pode levar alguns segundos)

### **4. Verificar Categorias Criadas**

Execute esta query para verificar se as categorias foram criadas:

```sql
SELECT COUNT(*) as total_categorias, 
       COUNT(DISTINCT organization_id) as organizacoes
FROM financeiro_categorias;
```

**Resultado esperado:**
- Deve retornar aproximadamente **84 categorias por organização**
- Se houver múltiplas organizações, o total será 84 × número de organizações

---

## ✅ APÓS APLICAR

1. ✅ Recarregue a página de Plano de Contas no localhost
2. ✅ As categorias devem aparecer na tela
3. ✅ Estrutura hierárquica completa (3.x, 4.x, 5.x, 6.x, 7.x)

---

## 📊 CATEGORIAS QUE SERÃO CRIADAS

### **Receitas Operacionais (3.x)**
- 3.1 - Receita de Aluguéis de Temporada (8 subcategorias)
- 3.2 - Receita de Serviços Adicionais (7 subcategorias)
- 3.3 - Receita de Comissões (2 subcategorias)
- 3.4 - Receita de Vendas de Imóveis
- 3.5 - Outras Receitas Operacionais (2 subcategorias)

### **Deduções da Receita (4.x)**
- 4.1 - Impostos sobre Receita (5 subcategorias)
- 4.2 - Comissões Pagas a OTAs (7 subcategorias)
- 4.3 - Descontos Concedidos

### **Custos Operacionais (5.x)**
- 5.1 - Custos com Limpeza e Conservação (4 subcategorias)
- 5.2 - Custos com Manutenção e Reparos (5 subcategorias)
- 5.3 - Custos com Consumo (Utilidades) (5 subcategorias)
- 5.4 - Custos com Condomínio (2 subcategorias)
- 5.5 - Custos com Seguros (2 subcategorias)
- 5.6 - Custos com Fornecimentos e Suprimentos (3 subcategorias)

### **Despesas Operacionais (6.x)**
- 6.1 - Despesas Administrativas (6 subcategorias)
- 6.2 - Despesas Comerciais e Marketing (5 subcategorias)
- 6.3 - Despesas com Tecnologia (3 subcategorias)
- 6.4 - Despesas Financeiras (3 subcategorias)
- 6.5 - Despesas com Impostos e Taxas (3 subcategorias)
- 6.6 - Outras Despesas Operacionais (3 subcategorias)

### **Resultado Financeiro (7.x)**
- 7.1 - Receitas Financeiras (2 subcategorias)

**Total: ~84 categorias por organização**

---

## ⚠️ IMPORTANTE

- ✅ O script é **idempotente** - pode ser executado múltiplas vezes sem erro
- ✅ Não cria duplicatas (usa `ON CONFLICT DO NOTHING`)
- ✅ Aplica para **TODAS as organizações existentes** automaticamente
- ✅ Cada organização recebe suas próprias 84 categorias

---

**Status:** ⚠️ **Aguardando aplicação da migration**

