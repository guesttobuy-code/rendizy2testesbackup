# ADR-001: Arquitetura CRM Modular Multi-Tenant

**Status:** ✅ Implementado  
**Data:** 2026-01-26  
**Autores:** Rafael + Copilot  
**Impacto:** Alto - Estrutura fundamental do CRM

---

## Contexto

O sistema Rendizy precisava de um CRM com três módulos distintos:
1. **VENDAS (Sales)** - Pipeline de vendas com deals
2. **SERVIÇOS (Services)** - Tickets de atendimento/suporte
3. **PRÉ-DETERMINADOS (Predetermined)** - Workflows automáticos (check-in, check-out)

Requisitos críticos:
- Multi-tenant: cada organização com dados 100% isolados
- Relatórios independentes por módulo
- Escalabilidade futura
- Manutenção simplificada

---

## Decisão

**Adotar arquitetura 100% MODULAR com tabelas separadas por tipo de funil.**

### Estrutura de Tabelas

```
📁 MÓDULO VENDAS (SALES)
├── sales_funnels           (Funis de vendas)
├── sales_funnel_stages     (Etapas dos funis)
├── sales_deals             (Cards/Negócios)
└── sales_deal_activities   (Timeline de atividades)

📁 MÓDULO SERVIÇOS (SERVICES)
├── service_funnels         (Funis de atendimento)
├── service_funnel_stages   (Etapas dos funis)
├── service_tickets         (Tickets/Chamados)
└── service_ticket_activities (Timeline de atividades)

📁 MÓDULO PRÉ-DETERMINADOS (PREDETERMINED)
├── predetermined_funnels        (Funis de workflow)
├── predetermined_funnel_stages  (Etapas dos workflows)
├── predetermined_items          (Items do workflow)
└── predetermined_item_activities (Timeline de atividades)
```

### Multi-Tenancy

Cada tabela principal contém `organization_id` + RLS (Row Level Security):

```sql
-- Exemplo: Política RLS para sales_funnels
CREATE POLICY sales_funnels_org_policy ON sales_funnels FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
```

### Rotas Backend (Edge Functions)

```
📁 supabase/functions/rendizy-server/
├── routes-sales.ts         → /crm/sales/*
├── routes-services.ts      → /crm/services/*
└── routes-predetermined.ts → /crm/predetermined/*
```

### APIs Frontend

```
📁 utils/
├── api-crm-sales.ts        (crmSalesApi)
├── api-crm-services.ts     (crmServicesApi)
└── api-crm-predetermined.ts (crmPredeterminedApi)
```

---

## Alternativas Consideradas

### ❌ Alternativa 1: Tabela Única com `type` column

```sql
-- REJEITADO
CREATE TABLE funnels (
  type VARCHAR(20) -- 'SALES', 'SERVICES', 'PREDETERMINED'
  ...
);
```

**Por que rejeitamos:**
- Queries complexas com filtros por tipo
- Campos específicos ficam nullable
- Relatórios misturados
- Difícil escalar módulos independentemente

### ❌ Alternativa 2: Herança de Tabelas PostgreSQL

```sql
-- REJEITADO
CREATE TABLE base_funnels (...);
CREATE TABLE sales_funnels () INHERITS (base_funnels);
```

**Por que rejeitamos:**
- Complexidade de manutenção
- Problemas com foreign keys
- RLS mais complicado

---

## Consequências

### ✅ Positivas

1. **Isolamento total** - Cada módulo é independente
2. **Relatórios limpos** - `SELECT * FROM sales_deals` vs filtrar por type
3. **Evolução independente** - Adicionar campo em service_tickets não afeta sales_deals
4. **Performance** - Índices otimizados por tabela
5. **Manutenção clara** - Arquivo routes-sales.ts só cuida de vendas

### ⚠️ Negativas (aceitas)

1. **Mais tabelas** - 12 tabelas ao invés de 4
2. **Código duplicado** - CRUD similar em 3 arquivos de rotas
3. **Migration maior** - 503 linhas de SQL

---

## Arquivos Criados/Modificados

### Migration SQL
- `APLICAR_MIGRATION_CRM_MODULAR.sql` - 503 linhas, cria 12 tabelas

### Backend (Edge Functions)
- `routes-sales.ts` - ~670 linhas
- `routes-services.ts` - ~660 linhas  
- `routes-predetermined.ts` - ~700 linhas
- `index.ts` - Adicionadas ~100 rotas

### Frontend APIs
- `utils/api-crm-sales.ts` - ~260 linhas
- `utils/api-crm-services.ts` - ~250 linhas
- `utils/api-crm-predetermined.ts` - ~280 linhas

### Componentes Atualizados
- `components/crm/FunnelSelector.tsx` - Usa APIs modulares
- `components/crm/DealsModule.tsx` - Usa crmSalesApi

---

## Verificação

Após executar a migration, conferir:

```sql
SELECT 'SALES FUNNELS' as module, COUNT(*) FROM sales_funnels
UNION ALL SELECT 'SALES STAGES', COUNT(*) FROM sales_funnel_stages
UNION ALL SELECT 'SERVICE FUNNELS', COUNT(*) FROM service_funnels
UNION ALL SELECT 'SERVICE STAGES', COUNT(*) FROM service_funnel_stages
UNION ALL SELECT 'PREDETERMINED FUNNELS', COUNT(*) FROM predetermined_funnels
UNION ALL SELECT 'PREDETERMINED STAGES', COUNT(*) FROM predetermined_funnel_stages;
```

Resultado esperado (4 organizações):
- 4 sales_funnels, 20 stages
- 4 service_funnels, 16 stages
- 4 predetermined_funnels, 12 stages

---

## Referências

- Migration: `APLICAR_MIGRATION_CRM_MODULAR.sql`
- Changelog: `docs/changelogs/2026-01-26-CRM-MODULAR-MULTI-TENANT.md`
- Projeto Supabase: `odcgnzfremrqnvtitpcc`
