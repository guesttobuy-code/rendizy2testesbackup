# ❓ QUESTÕES PENDENTES - SCHEMA DO BANCO

**Data:** 06/11/2025  
**Status:** ⚠️ Decisões Necessárias

---

## 🎯 QUESTÕES CRÍTICAS

### **1. evolution_instances - Multi-Tenant**

**Situação:**
- Schema atual **NÃO tem** `user_id`
- Migrations antigas **TINHAM** `user_id` com UNIQUE constraint
- Tabela `evolution_instances_backup` mantém estrutura antiga

**Perguntas:**
1. Como funciona multi-tenant agora?
2. Uma instância Evolution API para toda a organização?
3. Ou uma instância global única?
4. Como isolar dados entre organizações?

**Opções:**
- **A)** Adicionar `organization_id UUID` (FK para organizations)
- **B)** Manter sem FK (instância global)
- **C)** Adicionar `user_id` de volta (multi-tenant por usuário)

**Recomendação:** Opção A (organization_id) para manter multi-tenant por organização

---

### **2. Duas Tabelas de Configuração WhatsApp**

**Situação:**
- `organization_channel_config` (antiga, usa TEXT para organization_id)
- `chat_channels_config` (nova, usa UUID FK para organizations)

**Perguntas:**
1. Qual tabela usar?
2. Migrar dados da antiga para nova?
3. Manter ambas para compatibilidade?
4. Remover a antiga?

**Recomendação:** 
- Usar apenas `chat_channels_config` (mais completa)
- Migrar dados se houver
- Deprecar `organization_channel_config`

---

### **3. kv_store_67caf26a - Legado?**

**Situação:**
- Tabela ainda existe no schema
- Sistema migrou para SQL relacional
- Pode ter dados históricos

**Perguntas:**
1. Ainda está sendo usada?
2. Tem dados importantes?
3. Manter para compatibilidade?
4. Migrar dados e remover?

**Recomendação:**
- Verificar se há dados
- Se houver, migrar para tabelas relacionais
- Depois, remover ou manter apenas para logs

---

### **4. Campos ARRAY sem Tipo**

**Situação:**
Vários campos `ARRAY` sem especificar tipo:
```sql
webhook_events ARRAY
tags ARRAY
seo_keywords ARRAY
```

**Perguntas:**
1. Qual tipo usar? (TEXT[], UUID[], etc)
2. Adicionar constraints?

**Recomendação:**
- Especificar tipos: `TEXT[]`, `UUID[]`, etc
- Adicionar validações se necessário

---

### **5. RLS (Row Level Security)**

**Situação:**
- Schema não mostra políticas RLS
- Sistema é multi-tenant
- Segurança crítica

**Perguntas:**
1. RLS está implementado?
2. Quais políticas existem?
3. Precisa adicionar mais?

**Recomendação:**
- Verificar políticas existentes
- Documentar
- Adicionar se faltar

---

### **6. Índices de Performance**

**Situação:**
- Foreign keys criam índices automáticos
- Mas faltam índices para queries comuns

**Perguntas:**
1. Quais queries são mais usadas?
2. Quais campos precisam de índice?
3. Criar migration de índices?

**Recomendação:**
- Criar índices para:
  - Buscas por email, slug, código
  - Filtros por datas (reservas, bloqueios)
  - Status de conversas/mensagens
  - Ordenação por timestamps

---

### **7. Triggers de updated_at**

**Situação:**
- Algumas tabelas têm `updated_at`
- Mas não vejo triggers no schema

**Perguntas:**
1. Triggers existem?
2. Precisam ser criados?
3. Usar função genérica?

**Recomendação:**
- Criar função genérica `update_updated_at()`
- Aplicar em todas as tabelas com `updated_at`

---

### **8. Validações de Dados**

**Situação:**
- CHECK constraints existem
- Mas podem faltar validações

**Perguntas:**
1. Datas fazem sentido? (check_in < check_out)
2. Valores numéricos são positivos?
3. Campos obrigatórios estão corretos?

**Recomendação:**
- Adicionar validações:
  - `check_out > check_in` em reservations
  - `end_date > start_date` em blocks
  - Preços > 0
  - Capacidades > 0

---

## 📋 CHECKLIST DE DECISÕES

### **Arquitetura:**
- [ ] Decidir sobre `evolution_instances` (com ou sem FK)
- [ ] Decidir sobre tabelas WhatsApp config
- [ ] Decidir sobre `kv_store_67caf26a`

### **Dados:**
- [ ] Migrar dados do KV Store
- [ ] Migrar dados entre tabelas duplicadas
- [ ] Validar integridade referencial

### **Performance:**
- [ ] Criar índices necessários
- [ ] Analisar queries lentas
- [ ] Otimizar relacionamentos

### **Segurança:**
- [ ] Implementar/verificar RLS
- [ ] Documentar políticas
- [ ] Testar isolamento multi-tenant

### **Validações:**
- [ ] Especificar tipos de ARRAY
- [ ] Adicionar validações de dados
- [ ] Criar triggers de updated_at

### **Documentação:**
- [ ] Documentar relacionamentos
- [ ] Criar diagrama ER
- [ ] Documentar queries comuns

---

## 🚀 AÇÕES IMEDIATAS SUGERIDAS

### **1. Criar Migration de Correções**

```sql
-- Arquivo: 20241106_fix_schema_issues.sql

-- 1. Adicionar organization_id em evolution_instances (se necessário)
ALTER TABLE evolution_instances 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Especificar tipos de ARRAY
ALTER TABLE chat_channels_config 
ALTER COLUMN webhook_events TYPE TEXT[];

-- 3. Adicionar índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in, check_out);
-- ... etc

-- 4. Criar função genérica updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Adicionar validações
ALTER TABLE reservations 
ADD CONSTRAINT check_dates_valid 
CHECK (check_out > check_in);
```

### **2. Script de Migração KV Store → Relacional**

```sql
-- Arquivo: 20241106_migrate_kv_to_relational.sql

-- Migrar organizações
INSERT INTO organizations (id, name, slug, ...)
SELECT 
  (value->>'id')::UUID,
  value->>'name',
  value->>'slug',
  ...
FROM kv_store_67caf26a
WHERE key LIKE 'org:%'
ON CONFLICT (id) DO NOTHING;

-- Migrar propriedades
-- ... etc
```

### **3. Documentar RLS**

```sql
-- Arquivo: 20241106_rls_policies.sql

-- Exemplo para organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ... etc
```

---

## 📞 PRÓXIMOS PASSOS

1. **Revisar este documento** com o usuário
2. **Decidir sobre questões críticas**
3. **Criar migrations de correção**
4. **Migrar dados se necessário**
5. **Testar integridade**
6. **Atualizar backend**

---

**Status:** ⚠️ Aguardando Decisões  
**Prioridade:** Alta

