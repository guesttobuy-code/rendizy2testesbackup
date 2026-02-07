# 🔄 PROMPT HANDOFF — 2026-02-06
## Channex Integração: Pronto para Fase 3 (ARI Sync)

---

## 📍 CONTEXTO ATUAL

**Projeto:** Rendizy — PMS para gestão de aluguéis por temporada  
**Workspace:** `c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy`  
**Supabase Project:** `odcgnzfremrqnvtitpcc` (rendizy-server Edge Function)  
**GitHub:** `guesttobuy-code/rendizy2testesbackup` (branch `main`)

---

## ✅ O QUE FOI CONCLUÍDO HOJE (2026-02-06)

### 1. Fix Crítico: Trigger log_reservation_changes()
- **Problema:** Erro 500 ao cancelar reservas — trigger usava colunas erradas
- **Causa:** `log_reservation_changes()` usava `event_type, previous_data, new_data, actor_type`
- **Solução:** Corrigido para usar `change_type, old_values, new_values, changed_by_type`
- **Migration:** `supabase/migrations/2026020708_fix_log_reservation_changes_trigger.sql`
- **Status:** ✅ Executado em produção, cancelamento funcionando

### 2. Limpeza de Migrations
Removidas 6 migrations lixo/obsoletas:
- `_COMBINED_OTA_02_05.sql`
- `_DIAGNOSTICO_SCHEMA_09.sql`
- `2026012702_PRE_CHECK_migration.sql`
- `2026020309_CLEAN_AND_RUN.sql`
- `2026012706_seed_crm_tasks_test_data.sql`
- `2026012707_seed_crm_tasks_test_data.sql`

### 3. Schema Dump Completo
- **Arquivo:** `supabase/schema_dump_2026_02_06.sql` (753 KB)
- **Documentação:** `docs/database/SCHEMA_REFERENCE_2026_02_06.md`
- **Total:** 203 tabelas organizadas por domínio

### 4. Roadmap Atualizado
- **Versão:** 3.4
- **Arquivo:** `docs/roadmaps/ROADMAP_INTEGRACAO_CHANNEX_2026_02.md`
- **Commits:** `e05256a` (fix + cleanup), `c394f9e` (roadmap update)

---

## 🗂️ ARQUIVOS-CHAVE PARA LEITURA

### Roadmap Principal (LEIA PRIMEIRO)
```
docs/roadmaps/ROADMAP_INTEGRACAO_CHANNEX_2026_02.md
```
Contém:
- Status de todas as 6 fases
- Arquitetura multi-account Channex
- Arquitetura Rate Plans unificada
- Mapeamento de campos Property/Room/RatePlan ↔ Channex
- Lista de 30 itens concluídos

### Schema do Banco
```
supabase/schema_dump_2026_02_06.sql          # Schema SQL completo
docs/database/SCHEMA_REFERENCE_2026_02_06.md # Referência organizada por domínio
```

### Código Channex (Backend)
```
supabase/functions/rendizy-server/
├── utils-channex.ts               # Client base (HTTP, auth, types)
├── routes-channex.ts              # Rotas genéricas (test, status)
├── routes-channex-sync.ts         # CRUD accounts, sync property/rooms/rates
├── routes-calendar-availability-batch.ts  # Batch updates rate_plan_availability
├── index.ts                       # Registro de rotas
└── routes-reservations.ts         # Usa calculate_stay_price via RPC
```

### Hooks e Componentes (Frontend)
```
hooks/useCalendarPricingRules.ts   # V2.1 (legado, lê calendar_pricing_rules)
hooks/useCalendarAvailability.ts   # V3 (novo, lê rate_plan_availability)
components/GlobalSettingsManager.tsx  # Settings 13 seções funcionais
components/SettingsManager.tsx     # Settings por property
```

---

## 🎯 PRÓXIMO PASSO: FASE 3 — ARI SYNC

### O que é ARI?
**A**vailability, **R**ates, **I**nventory — sincronização de:
- Disponibilidade (quartos livres por dia)
- Preços (tarifa por noite)
- Restrições (min/max noites, stop_sell, CTA/CTD)

### Endpoint Channex
```
POST https://app.channex.io/api/v1/ari/updates
Header: user-api-key: <API_KEY>
```

### Payload Exemplo
```json
{
  "values": [
    {
      "room_type_id": "uuid-room-type",
      "date_from": "2026-02-10",
      "date_to": "2026-02-15",
      "availability": 1,
      "rate_plan_id": "uuid-rate-plan",
      "rate": 35000,           // centavos (R$350.00)
      "min_stay_arrival": 2,
      "stop_sell": false,
      "closed_to_arrival": false,
      "closed_to_departure": false
    }
  ]
}
```

### Rate Limits (IMPORTANTE)
- **20 req/min total** para ARI
- **10 req/min** para restrições/preços por property
- **Batch máximo:** 10MB por chamada

### Arquivo a Criar
```
supabase/functions/rendizy-server/routes-channex-ari.ts
```

### Funções Necessárias

#### 1. `syncARI(accountId, propertyId, dateFrom, dateTo)`
```typescript
// Fluxo:
// 1. Buscar channex_property_mappings → obter channex_property_id
// 2. Buscar channex_room_type_mappings → obter channex_room_type_id
// 3. Buscar channex_rate_plan_mappings → obter channex_rate_plan_id
// 4. Buscar rate_plan_availability para o período
// 5. Buscar reservations para calcular availability
// 6. Montar payload ARI
// 7. Enviar para Channex respeitando rate limits
// 8. Logar em ota_sync_logs
```

#### 2. `calculateAvailability(propertyId, roomId, date)`
```typescript
// Fórmula:
// availability = total_rooms - reservas_confirmadas - bloqueios
// Para vacation rentals (1 unidade): sempre 0 ou 1
```

#### 3. `getEffectivePrice(propertyId, ratePlanId, date)`
```typescript
// Já existe: calculate_stay_price() no banco
// Pode chamar via RPC ou replicar lógica
```

### Dados de Teste
**Property:** João e Gisele - Búzios RJ
- **Rendizy ID:** `dfe3d5d2-0691-4d64-bee3-e1bcae3ee915`
- **Rate Plan ID:** `cee6c0fe-f50b-4d94-90e9-f53529e8c336`
- **Preço base:** R$200/noite
- **Taxa limpeza:** R$130

### Rotas a Implementar
```
POST /channex/accounts/:accountId/ari/sync
  Body: { propertyId, dateFrom, dateTo }
  → Sync completo do período

POST /channex/accounts/:accountId/ari/update
  Body: { propertyId, date, field, value }
  → Update incremental (1 data, 1 campo)

GET /channex/accounts/:accountId/ari/status
  Query: ?propertyId=xxx
  → Ver última sync e pendências
```

---

## 🗄️ TABELAS RELEVANTES

### Rate Plans (Fonte de Verdade)
```sql
-- Rate Plan principal
SELECT * FROM rate_plans WHERE property_id = 'dfe3d5d2-...';

-- Disponibilidade diária
SELECT * FROM rate_plan_availability 
WHERE rate_plan_id = 'cee6c0fe-...' 
AND date BETWEEN '2026-02-10' AND '2026-02-20';

-- Overrides de preço
SELECT * FROM rate_plan_pricing_overrides
WHERE rate_plan_id = 'cee6c0fe-...'
AND date_from <= '2026-02-20' AND date_to >= '2026-02-10';
```

### Mapeamentos Channex
```sql
-- Property mapping
SELECT * FROM channex_property_mappings WHERE rendizy_property_id = 'dfe3d5d2-...';

-- Room type mapping
SELECT * FROM channex_room_type_mappings WHERE property_mapping_id = '...';

-- Rate plan mapping  
SELECT * FROM channex_rate_plan_mappings WHERE rendizy_rate_plan_id = 'cee6c0fe-...';
```

### Reservas (para calcular availability)
```sql
SELECT * FROM reservations 
WHERE property_id = 'dfe3d5d2-...'
AND status IN ('confirmed', 'checked_in')
AND check_out >= CURRENT_DATE;
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. property_rooms VAZIA
A tabela `property_rooms` está **vazia** (0 registros). Os dados de quartos ficam em `properties.data.rooms` (JSONB do Stays.net).

**Opções:**
- A) Adaptar sync para ler do JSONB
- B) Popular property_rooms a partir do JSONB (migration)

### 2. Channex Staging vs Production
- **Staging:** `https://staging.channex.io/api/v1`
- **Production:** `https://app.channex.io/api/v1`
- API Key de staging está em `channex_accounts` (environment = 'staging')

### 3. Preços em Centavos
Channex espera preços em **centavos inteiros**:
- R$350.00 → `rate: 35000`
- R$200.00 → `rate: 20000`

### 4. Sync Bidirecional (Fase 4)
Quando implementar webhooks, lembrar que reservas podem vir do Channex também (Airbnb, Booking, etc).

---

## 🔧 COMANDOS ÚTEIS

### Iniciar servidor dev
```powershell
cd "C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy"
npm run dev
```

### Deploy Edge Function
```powershell
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### Ver logs Edge Function
```powershell
supabase functions logs rendizy-server --project-ref odcgnzfremrqnvtitpcc --scroll
```

### Regenerar schema dump
```powershell
supabase db dump --linked --schema public -f supabase/schema_dump_YYYY_MM_DD.sql
```

### Testar conexão Channex
```powershell
curl -X GET "https://staging.channex.io/api/v1/properties" `
  -H "user-api-key: <API_KEY>"
```

---

## 📊 STATUS GERAL DO PROJETO

### Fases Channex
| Fase | Nome | Status | Dias |
|------|------|--------|------|
| 1 | Credenciais & Auth | ✅ Concluída | 1 |
| 2 | Mapping Entities | ✅ Concluída | 1 |
| 2.5 | Rate Plans Unificado | ✅ Concluída | 2 |
| **3** | **ARI Push & Sync** | **⏳ Próximo** | **4 est.** |
| 4 | Webhooks & Bookings | ⏳ Pendente | 3 est. |
| 5 | UI & Dashboard | ⏳ Pendente | 3 est. |
| 6 | Certificação | ⏳ Pendente | 2 est. |

### Migrations Aplicadas Hoje
1. `2026020708_fix_log_reservation_changes_trigger.sql` ✅

### Arquivos Criados/Modificados
- `supabase/migrations/2026020708_fix_log_reservation_changes_trigger.sql` ✅
- `supabase/schema_dump_2026_02_06.sql` ✅
- `docs/database/SCHEMA_REFERENCE_2026_02_06.md` ✅
- `docs/roadmaps/ROADMAP_INTEGRACAO_CHANNEX_2026_02.md` (atualizado v3.4) ✅

---

## 🚀 INSTRUÇÕES PARA CONTINUAR

1. **Leia o roadmap** (`docs/roadmaps/ROADMAP_INTEGRACAO_CHANNEX_2026_02.md`) — especialmente seções:
   - "FASE 3: ARI PUSH & SYNC" (linha ~1000)
   - "Mapeamento de Campos Rate Plan" (linha ~900)

2. **Crie o arquivo** `routes-channex-ari.ts` com as rotas descritas acima

3. **Implemente** `syncARI()` seguindo o fluxo documentado

4. **Teste** com a property João e Gisele (ID: `dfe3d5d2-0691-4d64-bee3-e1bcae3ee915`)

5. **Respeite rate limits** — implementar batching + exponential backoff

6. **Logue** resultados em `ota_sync_logs`

---

## 📝 NOTAS ADICIONAIS

### Credenciais Supabase
```
Project Ref: odcgnzfremrqnvtitpcc
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE
```

### Documentação Channex ARI
- Oficial: https://docs.channex.io/for-pms/availability-and-rates
- Rate Limits: https://docs.channex.io/for-pms/api-rate-limits

### Último commit
```
c394f9e - docs: atualiza roadmap v3.4 com fix trigger cancelamento e schema dump
```

---

**Autor:** GitHub Copilot  
**Data:** 2026-02-06 18:45  
**Sessão:** Fix trigger cancelamento + Preparação Fase 3
