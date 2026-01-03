# 🚨 DIAGNÓSTICO: Organizações Sumiram

**Data:** 01/12/2025  
**Problema:** 4 imobiliárias criadas sumiram do sistema  
**Severidade:** 🔴 **CRÍTICO** - Perda de dados persistentes

---

## 🔍 **ANÁLISE DO PROBLEMA**

### **Possíveis Causas:**

1. **❌ RLS (Row Level Security) bloqueando acesso**
   - Tabela `organizations` tem RLS habilitado
   - Política RLS pode estar bloqueando leitura
   - Service Role Key deveria bypassar, mas pode haver problema

2. **❌ Dados não foram salvos no SQL**
   - Organizações podem ter sido criadas no KV Store (antigo)
   - Migração de KV Store para SQL não foi executada
   - Dados ficaram no KV Store e foram perdidos

3. **❌ Problema de autenticação/tenancy**
   - Query está filtrando por organization_id incorretamente
   - Usuário não tem permissão para ver organizações
   - Token de autenticação inválido

4. **❌ Dados foram deletados acidentalmente**
   - Script de limpeza executado
   - Migration que dropou tabela
   - Deploy que resetou banco

---

## ✅ **AÇÕES IMEDIATAS**

### **1. Verificar se dados estão no banco:**
Execute o script SQL: `verificar-organizacoes-banco.sql`

### **2. Verificar RLS:**
```sql
-- Verificar se RLS está bloqueando
SELECT * FROM pg_policies WHERE tablename = 'organizations';
```

### **3. Verificar KV Store (dados antigos):**
```sql
SELECT * FROM kv_store_67caf26a WHERE key LIKE 'org:%';
```

### **4. Verificar logs do backend:**
- Procurar por erros ao criar organizações
- Verificar se dados foram salvos no SQL
- Verificar se há erros de RLS

---

## 🛡️ **PROTEÇÃO CONTRA PERDA DE DADOS**

### **Problema Identificado:**
- **Organizações foram migradas de KV Store para SQL**
- **Mas dados antigos podem não ter sido migrados**
- **RLS pode estar bloqueando acesso**

### **Solução Necessária:**

1. **✅ Verificar se dados estão no banco** (script SQL acima)
2. **✅ Se estiverem no KV Store, migrar para SQL**
3. **✅ Corrigir RLS se estiver bloqueando**
4. **✅ Garantir que Service Role Key está sendo usada**

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

- [ ] Executar `verificar-organizacoes-banco.sql` no Supabase
- [ ] Verificar se tabela `organizations` existe
- [ ] Verificar se há dados na tabela
- [ ] Verificar RLS policies
- [ ] Verificar KV Store para dados antigos
- [ ] Verificar logs do backend
- [ ] Verificar se Service Role Key está configurada

---

## 🔧 **CORREÇÕES NECESSÁRIAS**

### **Se dados estão no KV Store:**
1. Criar script de migração KV Store → SQL
2. Executar migração
3. Validar dados migrados

### **Se RLS está bloqueando:**
1. Verificar política RLS
2. Ajustar política para permitir Service Role
3. Testar acesso

### **Se dados foram deletados:**
1. Verificar backups
2. Restaurar de backup se disponível
3. Implementar proteção contra deleção acidental

---

## 📚 **REFERÊNCIAS**

- `REGRA_KV_STORE_VS_SQL.md` - Regra de uso de KV Store vs SQL
- `CORRECAO_ROTA_ORGANIZATIONS.md` - Correção da rota de organizações
- `supabase/migrations/20241117_add_legacy_imobiliaria_id_to_organizations.sql` - Migration de RLS

---

**STATUS:** 🔴 **URGENTE - INVESTIGAÇÃO NECESSÁRIA**

