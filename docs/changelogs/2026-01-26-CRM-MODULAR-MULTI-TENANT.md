# Changelog: CRM Modular Multi-Tenant

**Data:** 2026-01-26  
**Versão:** CRM v2.0  
**Tag:** `crm-modular-architecture`

---

## 🎯 Resumo

Implementação completa da arquitetura CRM modular com 3 módulos independentes:
- **VENDAS** - Pipeline de vendas (deals)
- **SERVIÇOS** - Tickets de atendimento
- **PRÉ-DETERMINADOS** - Workflows automáticos

Cada organização tem gestão 100% independente de funis e cards.

---

## 📊 Banco de Dados

### Tabelas Criadas (12 total)

#### Módulo VENDAS
| Tabela | Descrição |
|--------|-----------|
| `sales_funnels` | Funis de vendas |
| `sales_funnel_stages` | Etapas dos funis |
| `sales_deals` | Cards de negócios |
| `sales_deal_activities` | Timeline de atividades |

#### Módulo SERVIÇOS
| Tabela | Descrição |
|--------|-----------|
| `service_funnels` | Funis de atendimento |
| `service_funnel_stages` | Etapas dos funis |
| `service_tickets` | Tickets/Chamados |
| `service_ticket_activities` | Timeline de atividades |

#### Módulo PRÉ-DETERMINADOS
| Tabela | Descrição |
|--------|-----------|
| `predetermined_funnels` | Funis de workflow |
| `predetermined_funnel_stages` | Etapas dos workflows |
| `predetermined_items` | Items do workflow |
| `predetermined_item_activities` | Timeline de atividades |

### Índices Criados
- 27 índices otimizados para queries frequentes
- Índices compostos para ordenação de stages

### RLS Policies
- 12 políticas de Row Level Security
- Isolamento por `organization_id`

### Triggers
- 6 triggers para auto-update de `updated_at`

---

## 🔧 Backend (Edge Functions)

### Arquivos Criados

#### `routes-sales.ts`
```typescript
// Rotas: /crm/sales/*
listSalesFunnels()      // GET /crm/sales/funnels
getSalesFunnel()        // GET /crm/sales/funnels/:id
createSalesFunnel()     // POST /crm/sales/funnels
updateSalesFunnel()     // PUT /crm/sales/funnels/:id
deleteSalesFunnel()     // DELETE /crm/sales/funnels/:id
listSalesDeals()        // GET /crm/sales/deals
getSalesDeal()          // GET /crm/sales/deals/:id
createSalesDeal()       // POST /crm/sales/deals
updateSalesDeal()       // PUT /crm/sales/deals/:id
deleteSalesDeal()       // DELETE /crm/sales/deals/:id
moveSalesDeal()         // POST /crm/sales/deals/:id/move
getSalesStats()         // GET /crm/sales/stats
```

#### `routes-services.ts`
```typescript
// Rotas: /crm/services/*
// Mesma estrutura de CRUD para funnels + tickets
```

#### `routes-predetermined.ts`
```typescript
// Rotas: /crm/predetermined/*
// Mesma estrutura de CRUD para funnels + items
```

### index.ts - Rotas Registradas
```typescript
// ~100 novas rotas adicionadas
app.get("/crm/sales/funnels", tenancyMiddleware, salesRoutes.listSalesFunnels);
app.get("/crm/services/funnels", tenancyMiddleware, servicesRoutes.listServiceFunnels);
app.get("/crm/predetermined/funnels", tenancyMiddleware, predeterminedRoutes.listPredeterminedFunnels);
// ... etc
```

---

## 🎨 Frontend

### APIs Criadas

#### `utils/api-crm-sales.ts`
```typescript
export const crmSalesApi = {
  // Funnels
  list: () => apiRequest<SalesFunnel[]>('GET', '/crm/sales/funnels'),
  get: (id) => apiRequest<SalesFunnel>('GET', `/crm/sales/funnels/${id}`),
  create: (data) => apiRequest<SalesFunnel>('POST', '/crm/sales/funnels', data),
  update: (id, data) => apiRequest<SalesFunnel>('PUT', `/crm/sales/funnels/${id}`, data),
  delete: (id) => apiRequest<void>('DELETE', `/crm/sales/funnels/${id}`),
  
  // Deals
  listDeals: (params) => apiRequest<SalesDeal[]>('GET', '/crm/sales/deals', params),
  getDeal: (id) => apiRequest<SalesDeal>('GET', `/crm/sales/deals/${id}`),
  createDeal: (data) => apiRequest<SalesDeal>('POST', '/crm/sales/deals', data),
  updateDeal: (id, data) => apiRequest<SalesDeal>('PUT', `/crm/sales/deals/${id}`, data),
  deleteDeal: (id) => apiRequest<void>('DELETE', `/crm/sales/deals/${id}`),
  moveDeal: (id, stageId) => apiRequest<SalesDeal>('POST', `/crm/sales/deals/${id}/move`, { stage_id: stageId }),
  
  // Stats
  getStats: (funnelId) => apiRequest<SalesStats>('GET', `/crm/sales/stats`, { funnel_id: funnelId }),
};
```

#### `utils/api-crm-services.ts`
```typescript
export const crmServicesApi = { ... }; // Similar, para tickets
```

#### `utils/api-crm-predetermined.ts`
```typescript
export const crmPredeterminedApi = { ... }; // Similar, para items
```

### Componentes Atualizados

#### `FunnelSelector.tsx`
- Removido: imports antigos de `funnelsApi`
- Adicionado: imports de `crmSalesApi`, `crmServicesApi`, `crmPredeterminedApi`
- Adicionado: função `getApiForType()` que seleciona API correta
- Corrigido: `isGlobalDefault` → `is_default` (snake_case do banco)
- Removido: fallbacks para localStorage

#### `DealsModule.tsx`
- Atualizado para usar `crmSalesApi`
- Removido mocks e fallbacks

---

## 🔐 Multi-Tenancy

### Como funciona

1. **Login** → Define `organization_id` na sessão
2. **Middleware** → Extrai `organizationId` do token
3. **Rotas** → `c.get('organizationId')` filtra queries
4. **RLS** → PostgreSQL valida acesso adicional

### Exemplo de Query

```typescript
// routes-sales.ts
const organizationId = c.get('organizationId');

const { data } = await getSupabaseAdmin()
  .from('sales_funnels')
  .select('*, stages:sales_funnel_stages(*)')
  .eq('organization_id', organizationId)  // ← FILTRO MULTI-TENANT
  .order('created_at', { ascending: false });
```

---

## 📝 Comandos Executados

```bash
# 1. Migration no Supabase SQL Editor
# Executar conteúdo de: APLICAR_MIGRATION_CRM_MODULAR.sql

# 2. Deploy do backend
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --no-verify-jwt
```

---

## ✅ Verificação Pós-Deploy

1. Abrir sistema em `http://localhost:3001`
2. Fazer login
3. Ir para CRM → Vendas
4. Verificar se funis carregam (deve aparecer "Funil Principal")
5. Criar novo funil de teste
6. Criar deal de teste
7. Mover deal entre etapas

---

## 🐛 Problemas Conhecidos

1. **Tipos camelCase vs snake_case**: Frontend usa `is_default`, banco usa `is_default` - OK
2. **Stages inline**: Funil retorna stages junto em uma query só

---

## 📁 Arquivos para Referência Futura

```
docs/
├── adr/
│   └── ADR-001-CRM-MODULAR-ARCHITECTURE.md  ← ESTE ADR
└── changelogs/
    └── 2026-01-26-CRM-MODULAR-MULTI-TENANT.md  ← ESTE CHANGELOG

supabase/functions/rendizy-server/
├── routes-sales.ts         ← Rotas de vendas
├── routes-services.ts      ← Rotas de serviços
├── routes-predetermined.ts ← Rotas pré-determinados
└── index.ts               ← Registro das rotas

utils/
├── api-crm-sales.ts        ← API frontend vendas
├── api-crm-services.ts     ← API frontend serviços
└── api-crm-predetermined.ts ← API frontend pré-determinados

components/crm/
├── FunnelSelector.tsx      ← Seletor de funis (atualizado)
└── DealsModule.tsx         ← Módulo de vendas (atualizado)

APLICAR_MIGRATION_CRM_MODULAR.sql ← Migration principal
```

---

## 🏷️ Tags Git Sugeridas

```bash
git tag -a crm-modular-v2.0 -m "CRM Modular Multi-Tenant Architecture"
```
