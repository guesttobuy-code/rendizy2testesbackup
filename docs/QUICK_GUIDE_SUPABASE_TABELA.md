# 🚀 GUIA RÁPIDO: Onde as Imobiliárias Estão no Supabase

---

## 📍 RESPOSTA DIRETA

```
Tabela: kv_store_67caf26a
URL: https://supabase.com/dashboard/project/uknccixtubkdkofyieie/database/tables
```

---

## 🔍 COMO VER NO SUPABASE

### **Passo 1: Acessar Dashboard**
```
https://supabase.com/dashboard
```

### **Passo 2: Selecionar Projeto**
```
Projeto: uknccixtubkdkofyieie
```

### **Passo 3: Ir para Table Editor**
```
Menu lateral → "Table Editor" ou "Database"
```

### **Passo 4: Selecionar Tabela**
```
Tabela: kv_store_67caf26a
```

### **Passo 5: Filtrar Organizações**
```sql
-- Clicar em "SQL Editor" e executar:
SELECT * FROM kv_store_67caf26a 
WHERE key LIKE 'org:%';
```

---

## 📊 ESTRUTURA DA TABELA

```
┌─────────────────────┬────────────────────────────┐
│      COLUNA         │         TIPO               │
├─────────────────────┼────────────────────────────┤
│ key (PRIMARY KEY)   │ TEXT                       │
│ value               │ JSONB                      │
└─────────────────────┴────────────────────────────┘
```

---

## 🔑 EXEMPLO DE DADOS

```
key: "org:org_l3m5n7p9q2"

value: {
  "id": "org_l3m5n7p9q2",
  "name": "Imobiliária Costa do Sol",
  "slug": "rendizy_imobiliaria_costa_sol",
  "email": "contato@costasol.com",
  "plan": "free",
  "status": "trial",
  ...
}
```

---

## 🎯 QUERIES ÚTEIS

### **1. Listar todas organizações:**
```sql
SELECT 
  value->>'name' as nome,
  value->>'slug' as slug,
  value->>'email' as email,
  value->>'plan' as plano
FROM kv_store_67caf26a 
WHERE key LIKE 'org:%';
```

### **2. Contar organizações:**
```sql
SELECT COUNT(*) 
FROM kv_store_67caf26a 
WHERE key LIKE 'org:%';
```

### **3. Buscar por nome:**
```sql
SELECT * FROM kv_store_67caf26a 
WHERE key LIKE 'org:%' 
  AND value->>'name' ILIKE '%costa%';
```

### **4. Ver organização específica:**
```sql
SELECT * FROM kv_store_67caf26a 
WHERE key = 'org:org_l3m5n7p9q2';
```

---

## ✅ VERIFICAÇÃO RÁPIDA

**No Console do Navegador (F12):**
```javascript
// Quando você cria uma imobiliária:
✅ Resultado: {success: true, data: {...}}

// Isso significa que foi salvo em:
// kv_store_67caf26a com key: "org:{id}"
```

**No Supabase Dashboard:**
```
1. Table Editor → kv_store_67caf26a
2. Procurar por keys começando com "org:"
3. Ver JSON completo da organização
```

---

## 🔥 DICA PRO

**Query completa formatada:**
```sql
SELECT 
  key,
  jsonb_pretty(value) as dados_formatados
FROM kv_store_67caf26a 
WHERE key LIKE 'org:%'
ORDER BY value->>'createdAt' DESC;
```

Isso mostra o JSON de forma linda e organizada! 🎨

---

**Documentação Completa:** `/docs/TABELA_SUPABASE_ORGANIZACOES.md`
