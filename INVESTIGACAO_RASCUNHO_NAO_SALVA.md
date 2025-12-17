# 🔍 INVESTIGAÇÃO: Por que rascunhos não estão salvando?

**Data:** 02/12/2025  
**Status:** 🔍 Em investigação

---

## 🐛 PROBLEMA

Rascunhos não estão sendo salvos, nem:
- ❌ Via SQL direto no banco
- ❌ Via API
- ❌ Via interface

**Resultado da query:**
```json
{
  "total_rascunhos": 0,
  "rascunhos_sem_org": 0,
  "rascunhos_com_org": 0
}
```

---

## 🔍 POSSÍVEIS CAUSAS

### **1. Colunas opcionais não existem**
- `wizard_data` pode não existir
- `completion_percentage` pode não existir
- `completed_steps` pode não existir

**Solução aplicada:**
- ✅ Backend agora tenta inserir sem colunas opcionais se der erro
- ✅ Fallback para inserção básica

### **2. RLS (Row Level Security) bloqueando**
- Políticas RLS podem estar bloqueando INSERT
- Verificar políticas na tabela `properties`

### **3. Constraints NOT NULL sem DEFAULT**
- Alguma coluna obrigatória sem valor padrão
- Verificar colunas NOT NULL

### **4. Triggers bloqueando**
- Triggers BEFORE INSERT podem estar rejeitando
- Verificar triggers na tabela `properties`

---

## ✅ CORREÇÕES APLICADAS

1. **Backend - Fallback para colunas opcionais:**
   - ✅ Tenta inserir com colunas opcionais primeiro
   - ✅ Se falhar, tenta sem elas (inserção básica)

2. **Backend - Filtro organization_id:**
   - ✅ Superadmin agora vê rascunhos com `organization_id = NULL`

3. **Frontend - Seção primitiva:**
   - ✅ Seção sempre visível quando há rascunhos
   - ✅ Logs detalhados em cada etapa

---

## 🧪 TESTES PARA EXECUTAR

### **TESTE 1: Verificar estrutura da tabela**

Execute: `diagnostico-completo-rascunho.sql`

**O que verifica:**
- ✅ Se tabela existe
- ✅ Se RLS está habilitado
- ✅ Quais políticas RLS existem
- ✅ Quais colunas são NOT NULL
- ✅ Quais constraints CHECK existem
- ✅ Tenta inserir e mostra erro exato

### **TESTE 2: Tentar inserir diretamente**

Execute: `testar-inserir-rascunho-direto.sql`

**O que faz:**
- ✅ Verifica estrutura
- ✅ Tenta inserir rascunho mínimo
- ✅ Mostra erro se houver

### **TESTE 3: Aplicar migration se necessário**

Execute: `aplicar-migration-rascunhos.sql`

**O que faz:**
- ✅ Cria colunas opcionais se não existirem
- ✅ Verifica resultado

---

## 📋 CHECKLIST DE DIAGNÓSTICO

Execute na ordem:

1. ✅ **Verificar se tabela existe:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'properties';
   ```

2. ✅ **Verificar RLS:**
   ```sql
   SELECT rowsecurity FROM pg_tables WHERE tablename = 'properties';
   ```

3. ✅ **Verificar políticas RLS:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'properties';
   ```

4. ✅ **Verificar colunas NOT NULL:**
   ```sql
   SELECT column_name, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'properties' AND is_nullable = 'NO';
   ```

5. ✅ **Tentar inserir e ver erro:**
   ```sql
   INSERT INTO properties (id, status, name, code, type, ...)
   VALUES (gen_random_uuid(), 'draft', 'Teste', 'TEST-1', 'loc_casa', ...);
   ```

---

## 🎯 PRÓXIMOS PASSOS

1. ⏳ Executar `diagnostico-completo-rascunho.sql`
2. ⏳ Ver qual erro aparece
3. ⏳ Corrigir baseado no erro
4. ⏳ Testar novamente

---

**Execute o diagnóstico e me mostre o resultado!** 🔍
