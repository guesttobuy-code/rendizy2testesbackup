# 🔍 JORNADA DO DADO: Rascunho Salvo → Exibido

**Objetivo:** Rastrear a jornada completa do rascunho desde o salvamento até a exibição na tela.

---

## 📊 ETAPAS DA JORNADA

### **1. SALVAMENTO (Backend)**

```
Frontend → API POST /properties
  ↓
Backend recebe: { status: "draft", ... }
  ↓
createDraftPropertyMinimal() cria registro no banco
  ↓
Banco: INSERT INTO properties (id, status='draft', ...)
  ↓
Retorna: { success: true, data: { id, status: 'draft', ... } }
```

**Logs adicionados:**

- ✅ `🔍 [createProperty] Verificação de rascunho`
- ✅ `🆕 [createProperty] Rascunho sem ID - criando registro mínimo`
- ✅ `✅ [createDraftPropertyMinimal] Rascunho criado com ID`

---

### **2. BUSCA (Backend → Frontend)**

```
Frontend → API GET /properties
  ↓
Backend: SELECT * FROM properties WHERE organization_id = ?
  ↓
Backend filtra por organization_id
  ↓
Backend retorna: [{ id, status: 'draft', ... }, ...]
  ↓
Frontend recebe: propertiesResponse.data
```

**Logs adicionados:**

- ✅ `🔍 [listProperties] JORNADA DO DADO - Backend`
- ✅ Mostra total de properties e rascunhos
- ✅ Mostra organization_id usado no filtro

---

### **3. PROCESSAMENTO (Frontend)**

```
propertiesResponse.data
  ↓
Filtro: .filter(p => !p.locationId || p.status === 'draft')
  ↓
Mapeamento: .map(prop => ({ id, name, status, ... }))
  ↓
setProperties(allProperties)
```

**Logs adicionados:**

- ✅ `📊 [PropertiesManagement] RESPOSTA COMPLETA DA API`
- ✅ `🔍 [PropertiesManagement] Filtrando properties antes de mapear`
- ✅ `📝 [PropertiesManagement] Rascunhos encontrados`
- ✅ `🎯 [PropertiesManagement] PROPRIEDADES FINAIS QUE SERÃO EXIBIDAS`
- ✅ `🎯 [PropertiesManagement] EXIBINDO RASCUNHOS PRIMITIVOS`

---

### **4. EXIBIÇÃO (Frontend)**

```
properties state
  ↓
displayedProperties = filteredProperties
  ↓
Render: Seção primitiva de rascunhos (topo da lista)
  ↓
Render: Cards normais (grid/lista)
```

**Mudanças aplicadas:**

- ✅ Seção primitiva no topo (vermelha, amarela) mostrando TODOS os rascunhos
- ✅ Exibe: ID, Nome, Status, Progresso
- ✅ Clicável para editar

---

## 🐛 PONTOS DE FALHA IDENTIFICADOS

### **1. Filtro por organization_id**

**Problema:** Se rascunho foi criado com `organization_id = NULL` (superadmin), mas busca usa `organization_id` específico, não aparece.

**Solução:** Verificar se o rascunho foi criado com `organization_id` correto.

### **2. Filtro no Frontend**

**Problema:** Filtro `!p.locationId || p.status === 'draft'` pode excluir rascunhos que têm `locationId`.

**Solução:** Ajustado para incluir TODOS os rascunhos, independente de `locationId`.

### **3. Mapeamento de Status**

**Problema:** Status pode vir como string diferente de "draft" (case-sensitive).

**Solução:** Verificação case-insensitive: `String(p.status).toLowerCase() === "draft"`

---

## ✅ CORREÇÕES APLICADAS

1. **Backend:**

   - ✅ Logs detalhados em `listProperties`
   - ✅ Mostra `organization_id` usado no filtro
   - ✅ Mostra total de rascunhos encontrados

2. **Frontend:**
   - ✅ Logs detalhados em cada etapa
   - ✅ Seção primitiva de rascunhos (sempre visível)
   - ✅ Verificação case-insensitive de status
   - ✅ Inclui rascunhos independente de `locationId`

---

## 🧪 COMO TESTAR

1. **Criar rascunho via SQL:**

   ```sql
   INSERT INTO properties (id, status, name, code, type, ...)
   VALUES (gen_random_uuid(), 'draft', 'Teste', 'TEST-1', 'loc_casa', ...);
   ```

2. **Verificar logs do console:**

   - Abrir DevTools (F12)
   - Ir para aba Console
   - Procurar por: `🔍 [listProperties] JORNADA DO DADO`
   - Procurar por: `🎯 [PropertiesManagement] EXIBINDO RASCUNHOS PRIMITIVOS`

3. **Verificar tela:**
   - Deve aparecer seção vermelha/amarela no topo
   - Deve mostrar ID, Nome, Status do rascunho

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Verificar se rascunho aparece na seção primitiva
2. ✅ Verificar logs do backend (organization_id)
3. ✅ Verificar logs do frontend (filtro e mapeamento)
4. ✅ Identificar onde o dado está sendo perdido

---

**Criado em:** 02/12/2025  
**Status:** ✅ Logs e seção primitiva adicionados
