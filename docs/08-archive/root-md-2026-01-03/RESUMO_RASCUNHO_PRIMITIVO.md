# ✅ RASCUNHO PRIMITIVO - RESUMO

## 📦 ARQUIVOS CRIADOS

1. **`criar-rascunho-primitivo.sql`** ✅

   - Script SQL que insere rascunho diretamente no banco
   - Usa apenas campos obrigatórios (NOT NULL)
   - Forma mais primitiva possível

2. **`testar-rascunho-primitivo-api.js`** ✅

   - Script Node.js para testar via API
   - 3 cenários de teste diferentes

3. **`testar-rascunho-curl.ps1`** ✅

   - Script PowerShell para testar via API usando curl
   - Mais fácil de executar no Windows

4. **`executar-rascunho-primitivo.ps1`** ✅

   - Script PowerShell para executar SQL via Supabase CLI

5. **`TESTE_RASCUNHO_PRIMITIVO.md`** ✅
   - Documentação completa de como executar

---

## 🎯 FORMA MAIS PRIMITIVA DE SALVAR

### **Via SQL Direto (Mais Primitivo):**

```sql
INSERT INTO properties (
  id,                    -- gen_random_uuid() (gerado automaticamente)
  organization_id,       -- NULL (para superadmin)
  status,                -- 'draft'
  name,                  -- 'Rascunho Primitivo'
  code,                  -- 'DRAFT-PRIMITIVO-...' (único)
  type,                  -- 'loc_casa'
  address_city,          -- 'Rio de Janeiro'
  address_state,         -- 'RJ'
  address_country,       -- 'BR'
  max_guests,            -- 1
  pricing_base_price,    -- 0
  pricing_currency,      -- 'BRL'
  wizard_data,           -- '{}'::jsonb (vazio)
  completion_percentage, -- 0
  completed_steps,        -- ARRAY[]::TEXT[] (vazio)
  created_at,            -- NOW()
  updated_at             -- NOW()
) VALUES (...);
```

**Campos Mínimos Obrigatórios:**

- ✅ `id` (gerado automaticamente)
- ✅ `status` = `'draft'`
- ✅ `name` (qualquer string)
- ✅ `code` (qualquer string única)
- ✅ `type` (qualquer string)
- ✅ `address_city` (qualquer string)
- ✅ `address_state` (qualquer string)
- ✅ `address_country` (qualquer string, default 'BR')
- ✅ `max_guests` (qualquer inteiro >= 1)
- ✅ `pricing_base_price` (qualquer número, pode ser 0)
- ✅ `pricing_currency` (qualquer string, default 'BRL')
- ✅ `wizard_data` (qualquer JSONB, pode ser vazio)
- ✅ `completion_percentage` (qualquer inteiro 0-100)
- ✅ `completed_steps` (qualquer array, pode ser vazio)

---

## 🚀 COMO EXECUTAR AGORA

### **1. Via SQL (Mais Primitivo):**

```bash
# Opção A: Via Supabase CLI
supabase db execute --file criar-rascunho-primitivo.sql

# Opção B: Via psql direto
psql -h db.odcgnzfremrqnvtitpcc.supabase.co -U postgres -d postgres -f criar-rascunho-primitivo.sql
```

### **2. Via API (Teste Backend):**

```powershell
# 1. Obter token
# No navegador (F12): localStorage.getItem('rendizy-token')

# 2. Configurar token
$env:AUTH_TOKEN = "seu_token_aqui"

# 3. Executar teste
.\testar-rascunho-curl.ps1
```

---

## 🔍 VERIFICAR SE FOI CRIADO

```sql
-- Verificar último rascunho
SELECT
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📊 ESTRUTURA MÍNIMA ACEITA

### **Backend deve aceitar:**

```json
{
  "status": "draft"
}
```

**E preencher automaticamente:**

- `name` = "Rascunho de Propriedade"
- `code` = "DRAFT-..."
- `type` = "loc_casa"
- `address.city` = "Rio de Janeiro"
- `address.state` = "RJ"
- `address.country` = "BR"
- `maxGuests` = 1
- `basePrice` = 0
- `currency` = "BRL"
- `wizardData` = {}
- `completionPercentage` = 0
- `completedSteps` = []

---

## ✅ CONCLUSÃO

**Forma mais primitiva de salvar:**

1. ✅ Apenas `status: "draft"` é necessário
2. ✅ Backend deve preencher todos os campos obrigatórios automaticamente
3. ✅ Aceitar qualquer estrutura de dados
4. ✅ Não validar nada para rascunhos

**Próximo passo:**

- Verificar se o backend está fazendo isso corretamente
- Se não, ajustar `createDraftPropertyMinimal` para aceitar apenas `status: "draft"`

---

**Criado em:** 02/12/2025  
**Status:** ✅ Scripts criados e prontos para execução
