# 🚀 COMO EXECUTAR: SALVAR RASCUNHO VIA API

## ✅ Script criado: `executar-salvar-rascunho.ps1`

Este script já tem o token configurado e está pronto para executar!

---

## 📋 OPÇÕES DE EXECUÇÃO

### **Opção 1: Executar script direto (MAIS FÁCIL)**

```powershell
.\executar-salvar-rascunho.ps1
```

**Pronto!** O script já tem tudo configurado.

---

### **Opção 2: Usar script genérico com token**

```powershell
.\salvar-rascunho.ps1 -Token "bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9"
```

---

### **Opção 3: Configurar variável de ambiente**

```powershell
$env:AUTH_TOKEN = "bdf900df83d641f8cad5716b16ed97588790dc0057ff568f998d0d217ff57d6b4e180cb56843dbc4a3c781efd296acade723c2c70fd61a2f3cc414fee5ae36a9"
.\salvar-rascunho.ps1
```

---

## 🔍 VERIFICAR SE SALVOU

Depois de executar, use esta query SQL:

```sql
-- Último rascunho criado
SELECT id, status, name, code, type, created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
```

Ou execute: `encontrar-rascunho-criado.sql`

---

## 📊 O QUE O SCRIPT FAZ

1. ✅ Envia `POST /properties` com payload: `{ "status": "draft" }`
2. ✅ Usa o token de autenticação no header `X-Auth-Token`
3. ✅ Mostra a resposta completa da API
4. ✅ Mostra o ID do rascunho criado (se sucesso)
5. ✅ Mostra a query SQL para encontrar no banco

---

## ✅ RESULTADO ESPERADO

Se funcionar, você verá:

- ✅ Resposta com `success: true`
- ✅ `data.id` com o UUID do rascunho
- ✅ Query SQL pronta para copiar

---

**Execute agora:** `.\executar-salvar-rascunho.ps1` 🚀
