# 🧪 TESTE RASCUNHO PRIMITIVO

**Objetivo:** Criar um rascunho da forma mais simples possível, diretamente no banco de dados ou via API, sem passar pela interface.

---

## 📋 ARQUIVOS CRIADOS

1. **`criar-rascunho-primitivo.sql`** - Script SQL para inserir rascunho diretamente no banco
2. **`testar-rascunho-primitivo-api.js`** - Script Node.js para testar via API
3. **`testar-rascunho-curl.ps1`** - Script PowerShell para testar via API usando curl
4. **`executar-rascunho-primitivo.ps1`** - Script PowerShell para executar SQL diretamente

---

## 🚀 COMO EXECUTAR

### **OPÇÃO 1: Via SQL Direto (Mais Primitivo)**

```powershell
# Executar SQL diretamente no banco
supabase db execute -f criar-rascunho-primitivo.sql
```

Ou usar o script PowerShell:

```powershell
.\executar-rascunho-primitivo.ps1
```

**O que faz:**

- Insere um registro diretamente na tabela `properties`
- Usa apenas campos obrigatórios (NOT NULL)
- Gera ID automaticamente (`gen_random_uuid()`)
- Status = `'draft'`
- Valores mínimos para todos os campos obrigatórios

---

### **OPÇÃO 2: Via API (Teste de Backend)**

**1. Obter token de autenticação:**

```javascript
// No console do navegador (F12), após fazer login:
localStorage.getItem("rendizy-token");
```

**2. Configurar token no PowerShell:**

```powershell
$env:AUTH_TOKEN = "seu_token_aqui"
```

**3. Executar teste:**

```powershell
.\testar-rascunho-curl.ps1
```

**O que faz:**

- Testa 3 cenários diferentes:
  1. Rascunho mínimo (apenas `status: "draft"`)
  2. Rascunho com `wizardData` vazio
  3. Rascunho com apenas um campo (`name`)

---

## 📊 ESTRUTURA DO RASCUNHO PRIMITIVO

### **Campos Obrigatórios (NOT NULL):**

```sql
- id                    UUID (gerado automaticamente)
- organization_id       UUID (NULL para superadmin)
- status                TEXT ('draft')
- name                  TEXT ('Rascunho Primitivo')
- code                  TEXT ('DRAFT-PRIMITIVO-...')
- type                  TEXT ('loc_casa')
- address_city           TEXT ('Rio de Janeiro')
- address_state          TEXT ('RJ')
- address_country        TEXT ('BR')
- max_guests             INTEGER (1)
- pricing_base_price     NUMERIC (0)
- pricing_currency       TEXT ('BRL')
- wizard_data            JSONB ('{}')
- completion_percentage  INTEGER (0)
- completed_steps        TEXT[] (ARRAY[]::TEXT[])
- created_at            TIMESTAMPTZ (NOW())
- updated_at            TIMESTAMPTZ (NOW())
```

---

## 🔍 VERIFICAR RASCUNHO CRIADO

```sql
-- Verificar último rascunho criado
SELECT
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  completed_steps,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🎯 RESULTADO ESPERADO

Após executar qualquer um dos métodos acima, você deve ter:

1. ✅ Um registro na tabela `properties` com `status = 'draft'`
2. ✅ ID gerado automaticamente pelo banco
3. ✅ Valores mínimos para todos os campos obrigatórios
4. ✅ `wizard_data` vazio ou com estrutura mínima
5. ✅ `completion_percentage = 0`
6. ✅ `completed_steps = []`

---

## 🐛 TROUBLESHOOTING

### **Erro: "AUTH_TOKEN não configurado"**

```powershell
# Obter token do localStorage do navegador
# Depois configurar:
$env:AUTH_TOKEN = "seu_token_aqui"
```

### **Erro: "Name, code, and type are required"**

Isso significa que o backend não está detectando o rascunho corretamente. Verifique:

1. Se `status: "draft"` está sendo enviado
2. Se o backend está entrando em `createDraftPropertyMinimal`
3. Logs do backend no Supabase Dashboard

### **Erro: "Address with city and state is required"**

O backend está validando endereço mesmo para rascunhos. Verifique se a correção foi aplicada no backend.

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Executar teste SQL direto (mais primitivo)
2. ✅ Verificar se rascunho foi criado no banco
3. ✅ Testar via API com diferentes payloads
4. ✅ Verificar logs do backend
5. ✅ Ajustar backend se necessário

---

**Criado em:** 02/12/2025  
**Objetivo:** Entender a forma mais primitiva de salvar um rascunho
