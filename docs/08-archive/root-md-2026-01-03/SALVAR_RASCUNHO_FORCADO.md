# 🚀 SALVAR RASCUNHO FORÇADO - FORMA MAIS SIMPLES

**Objetivo:** Salvar um rascunho via API da forma mais simples possível e encontrar no banco.

---

## 📋 ARQUIVOS CRIADOS

1. **`salvar-rascunho-forcado-api.ps1`** - Script que salva via API
2. **`encontrar-rascunho-criado.sql`** - Query para encontrar o rascunho

---

## 🚀 COMO EXECUTAR

### **1. Obter token de autenticação:**

```javascript
// No console do navegador (F12), após fazer login:
localStorage.getItem("rendizy-token");
```

### **2. Configurar token:**

```powershell
$env:AUTH_TOKEN = "seu_token_aqui"
```

### **3. Executar script:**

```powershell
.\salvar-rascunho-forcado-api.ps1
```

**O que faz:**

- ✅ Envia apenas `{ "status": "draft" }` para a API
- ✅ Mostra resposta completa
- ✅ Mostra ID do rascunho criado
- ✅ Mostra query SQL para encontrar

---

## 🔍 ENCONTRAR RASCUNHO CRIADO

Execute: `encontrar-rascunho-criado.sql`

Ou use esta query simples:

```sql
-- Último rascunho criado
SELECT id, status, name, code, type, created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📊 PAYLOAD ENVIADO

```json
{
  "status": "draft"
}
```

**Isso é TUDO!** Apenas `status: "draft"`.

O backend deve:

1. Detectar que é rascunho
2. Criar registro mínimo
3. Preencher valores padrão
4. Retornar ID

---

## ✅ RESULTADO ESPERADO

Se funcionar, você verá:

- ✅ Resposta com `success: true`
- ✅ `data.id` com o UUID do rascunho
- ✅ Rascunho aparece na query SQL

---

**Execute o script e me mostre o resultado!** 🚀
