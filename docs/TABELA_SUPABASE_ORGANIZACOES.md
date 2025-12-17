# 📊 Tabela do Supabase: Onde as Imobiliárias são Salvas

**Versão:** v1.0.103.258  
**Data:** 03 NOV 2025  
**Status:** ✅ DOCUMENTADO

---

## 🎯 RESPOSTA DIRETA

**Pergunta:** Em qual tabela do Supabase você está salvando as imobiliárias?

**Resposta:**
```
Tabela: kv_store_67caf26a
Tipo: Key-Value Store (chave-valor)
Estrutura: { key: TEXT PRIMARY KEY, value: JSONB }
```

---

## 📋 ESTRUTURA DA TABELA

### **Nome da Tabela:**
```sql
kv_store_67caf26a
```

### **Schema SQL:**
```sql
CREATE TABLE kv_store_67caf26a (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

### **Características:**
- ✅ **Tipo:** Key-Value Store (NoSQL dentro de SQL)
- ✅ **Chave:** Texto único (PRIMARY KEY)
- ✅ **Valor:** JSON com estrutura flexível
- ✅ **Escalável:** Suporta qualquer tipo de dado JSON
- ✅ **Flexível:** Não precisa criar tabelas separadas

---

## 🔑 COMO AS IMOBILIÁRIAS SÃO SALVAS

### **1. Formato da Chave (Key):**

```javascript
// Padrão: org:{id}
// Exemplo:
"org:org_l3m5n7p9q2"
"org:org_k8j4h6g9f3"
"org:rendizy_master"
```

**Composição:**
- **Prefixo:** `org:` (identifica que é uma organização)
- **ID único:** Gerado automaticamente pelo backend

---

### **2. Formato do Valor (Value):**

```json
{
  "id": "org_l3m5n7p9q2",
  "slug": "rendizy_imobiliaria_costa_sol",
  "name": "Imobiliária Costa do Sol",
  "email": "contato@costasol.com",
  "phone": "(11) 99999-9999",
  "plan": "free",
  "status": "trial",
  "trialEndsAt": "2025-12-03T12:00:00.000Z",
  "createdAt": "2025-11-03T12:00:00.000Z",
  "createdBy": "user_master_rendizy",
  "settings": {
    "maxUsers": 2,
    "maxProperties": 5,
    "maxReservations": 50,
    "features": ["basic_calendar", "basic_reports"]
  },
  "billing": {
    "mrr": 0,
    "billingDate": 1
  }
}
```

---

## 🗄️ VISUALIZAÇÃO REAL NO SUPABASE

### **Tabela no Dashboard:**

```
┌─────────────────────────────┬────────────────────────────────────┐
│            key              │               value                │
├─────────────────────────────┼────────────────────────────────────┤
│ org:rendizy_master          │ { "id": "rendizy_master", ... }   │
│ org:org_l3m5n7p9q2          │ { "id": "org_l3m5n7p9q2", ... }   │
│ org:org_k8j4h6g9f3          │ { "id": "org_k8j4h6g9f3", ... }   │
│ user:user_abc123            │ { "id": "user_abc123", ... }      │
│ property:prop_xyz789        │ { "id": "prop_xyz789", ... }      │
└─────────────────────────────┴────────────────────────────────────┘
```

**URL para acessar:**
```
https://supabase.com/dashboard/project/uknccixtubkdkofyieie/database/tables
```

---

## 🔍 COMO FUNCIONA O KV STORE

### **Arquivo:** `/supabase/functions/server/kv_store.tsx`

```typescript
// SALVAR (SET)
await kv.set(`org:${id}`, organization);
// SQL gerado:
// INSERT INTO kv_store_67caf26a (key, value) 
// VALUES ('org:org_l3m5n7p9q2', '{"id":"org_l3m5n7p9q2",...}')
// ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

// BUSCAR (GET)
const org = await kv.get(`org:${id}`);
// SQL gerado:
// SELECT value FROM kv_store_67caf26a 
// WHERE key = 'org:org_l3m5n7p9q2';

// LISTAR POR PREFIXO (GET BY PREFIX)
const allOrgs = await kv.getByPrefix('org:');
// SQL gerado:
// SELECT key, value FROM kv_store_67caf26a 
// WHERE key LIKE 'org:%';

// DELETAR (DELETE)
await kv.del(`org:${id}`);
// SQL gerado:
// DELETE FROM kv_store_67caf26a 
// WHERE key = 'org:org_l3m5n7p9q2';
```

---

## 📂 ESTRUTURA DE CHAVES NO KV STORE

O sistema usa **prefixos** para organizar diferentes tipos de dados:

```
Organizações:
  org:rendizy_master
  org:org_l3m5n7p9q2
  org:org_k8j4h6g9f3

Usuários:
  user:user_abc123
  user:user_def456

Propriedades:
  property:prop_xyz789
  property:prop_uvw456

Reservas:
  reservation:res_abc123
  reservation:res_def456

Etc...
```

**Vantagem:**
- ✅ Uma única tabela para tudo
- ✅ Fácil de buscar por tipo (usando prefixo)
- ✅ Flexível: adiciona novos tipos sem alterar schema
- ✅ Rápido: índice em chave primária

---

## 🚀 FLUXO COMPLETO DE CRIAÇÃO

### **Frontend → Backend → Supabase:**

```
1️⃣ FRONTEND (CreateOrganizationModal.tsx)
   ↓
   POST https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/organizations
   Body: { name: "Costa do Sol", email: "...", ... }

2️⃣ BACKEND (routes-organizations.ts)
   ↓
   Gera ID: org_l3m5n7p9q2
   Gera Slug: rendizy_imobiliaria_costa_sol
   Valida dados
   ↓
   await kv.set(`org:org_l3m5n7p9q2`, organization)

3️⃣ KV STORE (kv_store.tsx)
   ↓
   const { error } = await supabase
     .from("kv_store_67caf26a")
     .upsert({ key: "org:org_l3m5n7p9q2", value: {...} })

4️⃣ SUPABASE (Postgres Database)
   ↓
   INSERT INTO kv_store_67caf26a (key, value)
   VALUES ('org:org_l3m5n7p9q2', '{"id":"..."}')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value

5️⃣ DADOS SALVOS ✅
```

---

## 🔍 COMO VERIFICAR OS DADOS NO SUPABASE

### **1. Acessar o Dashboard:**

1. Ir para: https://supabase.com/dashboard
2. Selecionar projeto: `uknccixtubkdkofyieie`
3. Menu lateral: **"Table Editor"** ou **"Database"**
4. Selecionar tabela: **`kv_store_67caf26a`**

---

### **2. Visualizar Imobiliárias:**

**Filtrar apenas organizações:**
```sql
SELECT * FROM kv_store_67caf26a 
WHERE key LIKE 'org:%';
```

**Resultado esperado:**
```
key                              | value
---------------------------------|----------------------------------------
org:rendizy_master              | {"id":"rendizy_master","name":"RENDIZY Master",...}
org:org_l3m5n7p9q2              | {"id":"org_l3m5n7p9q2","name":"Costa do Sol",...}
```

---

### **3. Contar Imobiliárias:**

```sql
SELECT COUNT(*) 
FROM kv_store_67caf26a 
WHERE key LIKE 'org:%';
```

---

### **4. Buscar por Nome:**

```sql
SELECT * FROM kv_store_67caf26a 
WHERE key LIKE 'org:%' 
  AND value->>'name' ILIKE '%costa%';
```

**Explicação:**
- `value->>'name'`: Acessa o campo `name` dentro do JSON
- `ILIKE`: Busca case-insensitive

---

## 📊 VANTAGENS DO KV STORE

### **✅ Benefícios:**

1. **Simplicidade:**
   - Uma única tabela para todo o sistema
   - Não precisa criar migrations complexas
   - Fácil de entender e manter

2. **Flexibilidade:**
   - Estrutura JSON permite campos dinâmicos
   - Adiciona novos campos sem ALTER TABLE
   - Perfeito para prototipagem rápida

3. **Performance:**
   - Índice na chave primária (key)
   - Busca rápida por prefixo (org:, user:, etc.)
   - PostgreSQL otimizado para JSONB

4. **Multi-tenant:**
   - Todos os dados de todas organizações em um lugar
   - Isolamento lógico via prefixo
   - Fácil de escalar

---

### **⚠️ Limitações:**

1. **Relacionamentos:**
   - Não há foreign keys automáticas
   - Precisa gerenciar manualmente

2. **Queries Complexas:**
   - JOINs entre tipos requerem múltiplas queries
   - Não há índices em campos JSON específicos

3. **Validação:**
   - Sem schema rígido (pode inserir qualquer JSON)
   - Validação acontece no backend

4. **Escalabilidade:**
   - OK para milhares de registros
   - Para milhões, considerar tabelas separadas

---

## 🎯 QUANDO MIGRAR PARA TABELAS SEPARADAS?

### **Continuar com KV Store se:**
- ✅ Menos de 10.000 organizações
- ✅ Prototipagem/MVP
- ✅ Estrutura de dados ainda está mudando
- ✅ Simplicidade é prioridade

### **Migrar para tabelas separadas se:**
- ❌ Mais de 100.000 organizações
- ❌ Queries complexas frequentes (JOINs, agregações)
- ❌ Necessidade de foreign keys
- ❌ Performance crítica em buscas complexas

---

## 🔄 EXEMPLO DE MIGRAÇÃO FUTURA

Se/quando precisar migrar para tabelas separadas:

### **Schema SQL Futuro:**

```sql
-- Tabela de Organizações
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT NOT NULL,
  settings JSONB,
  billing JSONB
);

-- Índices
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- Tabela de Usuários
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

**Vantagens após migração:**
- ✅ Foreign keys automáticas
- ✅ Queries complexas mais rápidas
- ✅ Integridade referencial
- ✅ Melhor performance em grande escala

---

## 🧪 COMO TESTAR A CONEXÃO

### **1. Verificar no Console do Frontend:**

```javascript
// Abrir DevTools (F12) → Console
// Quando você cria uma imobiliária, deve ver:

🚀 Enviando requisição para criar organização: {name: "...", ...}
📍 URL: https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/organizations
📥 Resposta recebida: 201 Created
✅ Resultado: {success: true, data: {...}}
```

---

### **2. Verificar Logs do Backend:**

```javascript
// Logs do Supabase Edge Function:

📥 Recebendo requisição POST /organizations
📦 Body recebido: {"name":"Costa do Sol",...}
✅ Validação passou, criando organização...
✅ Organization created: rendizy_imobiliaria_costa_sol (org_l3m5n7p9q2)
```

---

### **3. Verificar Diretamente no Supabase:**

```sql
-- SQL Query no Supabase Dashboard:

SELECT 
  key,
  value->>'name' as name,
  value->>'slug' as slug,
  value->>'email' as email,
  value->>'plan' as plan,
  value->>'status' as status,
  value->>'createdAt' as created_at
FROM kv_store_67caf26a 
WHERE key LIKE 'org:%'
ORDER BY value->>'createdAt' DESC;
```

**Resultado esperado:**
```
key                    | name              | slug                          | email              | plan | status | created_at
-----------------------|-------------------|-------------------------------|--------------------| ---- |--------|------------
org:org_l3m5n7p9q2    | Costa do Sol      | rendizy_imobiliaria_costa_sol | contato@costa.com  | free | trial  | 2025-11-03...
org:rendizy_master    | RENDIZY Master    | rendizy                       | master@rendizy.com | ... | ...    | 2025-11-01...
```

---

## 📚 REFERÊNCIAS

### **Arquivos Relacionados:**

1. **Backend:**
   - `/supabase/functions/server/routes-organizations.ts` - Rotas de organizações
   - `/supabase/functions/server/kv_store.tsx` - Interface KV Store
   - `/supabase/functions/server/index.tsx` - Servidor principal

2. **Frontend:**
   - `/components/CreateOrganizationModal.tsx` - Modal de criação
   - `/components/TenantManagement.tsx` - Listagem de organizações

3. **Utils:**
   - `/utils/supabase/info.tsx` - Credenciais Supabase

---

## 🎯 RESUMO EXECUTIVO

**Onde está salvo:**
```
✅ Tabela: kv_store_67caf26a
✅ Formato: Key-Value Store
✅ Chave: org:{id}
✅ Valor: JSON completo da organização
✅ Localização: Supabase Postgres
```

**Como funciona:**
```
Frontend → POST → Backend → KV Store → Supabase → ✅ Salvo
```

**Como verificar:**
```
Dashboard Supabase → Table Editor → kv_store_67caf26a → Filtrar por 'org:%'
```

**Status atual:**
```
✅ Sistema 100% funcional
✅ Salvando no Supabase
✅ NÃO usa localStorage
✅ Dados persistentes e seguros
```

---

**Versão:** v1.0.103.258-SUPABASE-ONLY  
**Última Atualização:** 03 NOV 2025  
**Tabela:** `kv_store_67caf26a`  
**Status:** ✅ OPERACIONAL
