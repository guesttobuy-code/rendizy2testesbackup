# 🗓️ Calendar Pricing Rules - Migration Manual

## Status: Aguardando aplicação manual

A migration para a tabela `calendar_pricing_rules` precisa ser aplicada manualmente no Supabase Dashboard.

## Passos para aplicar:

### 1. Acesse o SQL Editor do Supabase
```
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql
```

### 2. Cole e execute o SQL abaixo

O arquivo está em: `supabase/migrations/20260105_create_calendar_pricing_rules.sql`

```sql
-- ============================================================
-- Calendar Pricing Rules (Multi-tenant)
-- Cada organização pode ter suas próprias regras de preço/condição/restrição por data
-- ============================================================

-- Tabela principal de regras de calendário
CREATE TABLE IF NOT EXISTS calendar_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  condition_percent DECIMAL(5,2) DEFAULT 0,
  min_nights INTEGER DEFAULT 1 CHECK (min_nights >= 1),
  restriction TEXT DEFAULT NULL,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_condition_percent CHECK (condition_percent BETWEEN -100 AND 500)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_org 
  ON calendar_pricing_rules(organization_id);
  
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_property 
  ON calendar_pricing_rules(property_id) WHERE property_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_dates 
  ON calendar_pricing_rules(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_org_dates 
  ON calendar_pricing_rules(organization_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_calendar_pricing_rules_global 
  ON calendar_pricing_rules(organization_id, start_date, end_date) 
  WHERE property_id IS NULL;

-- RLS (Row Level Security)
ALTER TABLE calendar_pricing_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY calendar_pricing_rules_select_policy ON calendar_pricing_rules
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY calendar_pricing_rules_insert_policy ON calendar_pricing_rules
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY calendar_pricing_rules_update_policy ON calendar_pricing_rules
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY calendar_pricing_rules_delete_policy ON calendar_pricing_rules
  FOR DELETE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );
```

### 3. Verifique se a tabela foi criada

Execute este SQL para verificar:
```sql
SELECT * FROM calendar_pricing_rules LIMIT 1;
```

Se retornar sem erro (mesmo vazio), a tabela foi criada com sucesso.

---

## O que foi implementado no código:

### 1. Hook `useCalendarPricingRules` (hooks/useCalendarPricingRules.ts)
- Carrega regras do banco por organization_id
- Métodos: `getRuleForDate`, `upsertRule`, `bulkUpsertRules`, `deleteRule`
- Suporta `applyBatchRules` param para lógica de sobreposição

### 2. CalendarGrid.tsx
- Integrado com o hook
- Células de Condição (%), Restrições, Mín. noites mostram dados reais do banco
- Suporta regras por imóvel e regras globais (batch)

### 3. CalendarBulkRules.tsx
- Seção "Regras em Lote" restaurada com 3 linhas expandíveis
- Mostra dados reais do banco para regras globais (property_id = null)

### Lógica de sobreposição:
- `getRuleForDate(propertyId, date, applyBatchRules=false)`:
  - Se `applyBatchRules=true`: regras batch (property_id=null) sobrepõem regras específicas
  - Se `applyBatchRules=false`: regras específicas do imóvel têm prioridade

---

## Próximos passos após aplicar migration:

1. ✅ Commit e push do código
2. ✅ Testar no admin: expandir imóvel no calendário e verificar se Condição/Restrições/Mín.noites mostram "—"
3. 🔲 Implementar salvamento: quando usuário edita uma célula, chamar `upsertRule()`
4. 🔲 Implementar modal de edição em lote (já existe BulkPriceConditionModal, BulkRestrictionsModal, BulkMinNightsModal)
5. 🔲 Conectar API /calendar do site cliente para usar regras do banco

