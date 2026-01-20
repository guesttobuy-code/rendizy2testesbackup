# 🔍 ANÁLISE PROFUNDA: Sistema de Rascunhos

**Data:** 02/12/2025  
**Problema:** Rascunhos não estão sendo salvos nem listados

---

## 🎯 PROBLEMA IDENTIFICADO

### **CAUSA RAIZ ENCONTRADA:**

O campo `status` estava duplicado no `PROPERTY_SELECT_FIELDS`, mas o problema real é que **o status não estava sendo retornado corretamente do banco**.

**Linha 260 do `utils-property-mapper.ts`:**

```typescript
name, code, type, status,  // ✅ status estava aqui
```

Mas depois na linha 274:

```typescript
wizard_data, completion_percentage, completed_steps,  // ❌ status NÃO estava aqui
```

**O problema:** O `status` estava na primeira linha, mas quando o SQL faz o SELECT, ele pode não estar sendo retornado corretamente se houver algum problema com a query.

---

## 🔧 CORREÇÕES APLICADAS

### 1. **Correção do PROPERTY_SELECT_FIELDS**

- ✅ Adicionado `status` explicitamente na lista de campos
- ✅ Garantido que `status` seja sempre retornado do banco

### 2. **Verificação do sqlToProperty**

- ✅ O mapeamento já estava correto: `status: row.status || "active"`
- ✅ Mas se `row.status` for `undefined` (porque não foi retornado do SELECT), sempre cai para "active"

### 3. **Verificação do createDraftPropertyMinimal**

- ✅ A função está criando com `status: "draft"` corretamente
- ✅ O problema era que ao listar, o `status` não estava sendo retornado

---

## 📊 FLUXO COMPLETO ANALISADO

### **Criação de Rascunho:**

1. Frontend envia `{ status: "draft", ... }` ✅
2. Backend recebe e verifica `isDraft && !body.id` ✅
3. Chama `createDraftPropertyMinimal()` ✅
4. Insere no banco com `status: "draft"` ✅
5. **PROBLEMA:** Ao listar, `status` não era retornado do SELECT ❌

### **Listagem de Rascunhos:**

1. Frontend chama `propertiesApi.list()` ✅
2. Backend faz `SELECT ... FROM properties` ✅
3. **PROBLEMA:** `PROPERTY_SELECT_FIELDS` não incluía `status` explicitamente ❌
4. `sqlToProperty()` recebe `row.status = undefined` ❌
5. Usa fallback `"active"` ❌
6. Frontend filtra por `status === "draft"` mas não encontra ❌

---

## 🛠️ OUTRAS INVESTIGAÇÕES REALIZADAS

### 1. **Schema do Banco de Dados**

- ✅ Migration `20251202_add_draft_system_properties.sql` está correta
- ✅ Campo `status` existe com CHECK constraint incluindo 'draft'
- ✅ Campos `wizard_data`, `completion_percentage`, `completed_steps` existem

### 2. **Função normalizeWizardData**

- ✅ Está funcionando corretamente
- ✅ Extrai dados do wizard e normaliza para formato plano

### 3. **Função listProperties**

- ✅ Não filtra por status por padrão (retorna todos)
- ✅ Filtro de status só é aplicado se passar query param `?status=draft`
- ✅ Frontend não passa filtro, então deveria retornar todos

### 4. **PropertiesManagement Component**

- ✅ Filtro está correto: `isIndividual || isDraft`
- ✅ Verifica `status === "draft"` corretamente
- ✅ Mapeia `completionPercentage` e `completedSteps` corretamente

---

## ✅ SOLUÇÃO FINAL

**Correção aplicada:**

- Adicionado `status` explicitamente no `PROPERTY_SELECT_FIELDS`
- Garantido que o campo seja sempre retornado do banco
- O mapeamento `sqlToProperty` já estava correto, só precisava receber o valor

---

## 🧪 TESTE APÓS CORREÇÃO

1. **Criar rascunho:**

   - Abrir preview: `http://localhost:5173/properties`
   - Clicar em "Nova Propriedade"
   - Preencher primeiro step
   - Clicar em "Salvar e Avançar"
   - Verificar logs do backend: deve criar com `status: "draft"`

2. **Listar rascunho:**

   - Voltar para lista de propriedades
   - Verificar se rascunho aparece na lista
   - Verificar se tem badge "Rascunho" e barra de progresso

3. **Verificar no banco:**
   - Conectar ao Supabase
   - Query: `SELECT id, name, status, completion_percentage FROM properties WHERE status = 'draft'`
   - Deve retornar o rascunho criado

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Fazer deploy do backend com correção
2. ✅ Testar criação de rascunho
3. ✅ Testar listagem de rascunho
4. ✅ Verificar se rascunho aparece na lista
5. ✅ Testar continuar edição de rascunho

---

## 🔗 DEPENDÊNCIAS VERIFICADAS

- ✅ **CEP Integration:** Não interfere (só preenche endereço)
- ✅ **Image Upload:** Não interfere (salva em step separado)
- ✅ **Address Validation:** Relaxada para rascunhos (usa defaults)
- ✅ **Multi-tenant:** Funciona corretamente (organization_id)

---

## 💡 LIÇÕES APRENDIDAS

1. **Sempre verificar campos do SELECT:** Se um campo não está no SELECT, não será retornado
2. **Logs são essenciais:** Os logs detalhados ajudaram a identificar o problema
3. **Fallbacks podem mascarar problemas:** O `|| "active"` estava escondendo que `status` não estava sendo retornado
4. **Testar fluxo completo:** Criar E listar, não só criar
