# 🔄 PROMPT DE CONTINUIDADE - Consolidação Edge Functions

**Data**: 18/01/2026  
**Sessão**: Consolidação de Edge Functions + Tracking de Comissão  
**Status**: ✅ COMPLETO

---

## 📋 CONTEXTO OBRIGATÓRIO PARA A PRÓXIMA IA

Você está trabalhando no projeto **Rendizy** - um sistema de gestão de aluguel de temporada integrado com Stays.net.

### Projeto Supabase
- **Project Ref**: `odcgnzfremrqnvtitpcc`
- **Nome**: Rendizy2producao
- **URL**: `https://odcgnzfremrqnvtitpcc.supabase.co`

---

## ✅ O QUE FOI FEITO NESTA SESSÃO

### 1. Tracking de Comissão da Plataforma

**Problema**: Discrepância de receita entre Stays.net (R$ 922k) e Rendizy (R$ 885k).

**Causa Raiz**: A comissão da plataforma (`partner.commission._mcval.BRL`) não estava sendo armazenada.

**Solução Implementada**:

1. **Migração**: `supabase/migrations/20260118_add_platform_commission_fields.sql`
   - Adicionou `pricing_platform_commission INTEGER NOT NULL DEFAULT 0`
   - Adicionou `platform_partner_name TEXT`
   - Adicionou `platform_commission_type TEXT`
   - UPDATE corrigiu dados existentes a partir de `staysnet_raw`

2. **Backend**: `supabase/functions/rendizy-server/routes-staysnet-webhooks.ts`
   - Extrai comissão de `partner.commission._mcval.BRL`
   - Converte reais → centavos (×100)

3. **Mapper**: `supabase/functions/rendizy-server/utils-reservation-mapper.ts`
   - `sqlToReservation`: mapeia `pricing_platform_commission`
   - `reservationToSql`: persiste `pricing_platform_commission`

4. **Types**: `supabase/functions/rendizy-server/types.ts`
   - `Reservation.pricing.platformCommission: number`

5. **API**: `supabase/functions/rendizy-server/routes-reservations.ts`
   - Endpoint summary retorna `revenue`, `platformCommission`, `netRevenue`

**Resultado**: Receita agora bate: R$ 922.866,50 ≈ Stays.net R$ 922.193,54 ✅

---

### 2. Consolidação de Edge Functions (ADR)

**Problema**: Múltiplas Edge Functions separadas causaram 20 dias sem webhooks (incidente dez/2025-jan/2026).

**Decisão Arquitetural**: Centralizar TUDO em `rendizy-server` + `rendizy-public` apenas.

**O QUE FOI DELETADO DO SUPABASE**:

| Function | Motivo |
|----------|--------|
| `staysnet-webhook-receiver` | Migrada para `/staysnet/webhook/:orgId` |
| `staysnet-webhooks-cron` | Migrada para `/cron/staysnet-webhooks` |
| `staysnet-properties-sync-cron` | Migrada para `/cron/staysnet-properties-sync` |
| `execute-rpc-fix` | Hotfix obsoleto de 06/01 |
| `fix-rpc-function` | Hotfix obsoleto de 06/01 |
| `calendar-rules-batch` | Migrada para `/calendar-rules/batch` |

**O QUE FOI CRIADO/MODIFICADO**:

1. **`supabase/functions/rendizy-server/routes-cron-staysnet.ts`** (NOVO)
   - `cronStaysnetPropertiesSync()` - Sync propriedades 2x/dia
   - `cronStaysnetWebhooks()` - Processa webhooks a cada 5min

2. **`supabase/functions/rendizy-server/routes-calendar-rules-batch.ts`** (NOVO)
   - `calendarRulesBatchGet()` - Lista regras com filtros
   - `calendarRulesBatchPost()` - Processa operações em lote
   - ⚠️ Usa `Context` do Hono, NÃO `Request`

3. **`supabase/functions/rendizy-server/index.ts`** (MODIFICADO)
   - Novos imports e rotas registradas

4. **`App.tsx`** (MODIFICADO)
   - URL atualizada: `/rendizy-server/calendar-rules/batch`

5. **Migração**: `supabase/migrations/20260118_consolidate_cron_jobs_centralized.sql`
   - Atualiza pg_cron para usar novas URLs

---

## 📁 DOCUMENTOS CRÍTICOS A LER

### ADRs (Architecture Decision Records)

1. **`docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md`** ⚠️ OBRIGATÓRIO
   - Define regra: APENAS 2 Edge Functions permitidas
   - Lista todas as funções deletadas e motivos
   - Contém histórico do incidente de 20 dias

2. **`docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md`**
   - Regras de proteção contra regressões
   - Checklist antes de modificar código

3. **`docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md`**
   - Padrão para operações de banco de dados
   - Exemplo: `save_anuncio_field` (UPSERT + idempotência)

### Prompts de Handoff Anteriores

- `_PROMPT_HANDOFF_2026_01_06_SITES_PROMPT.md` - Sites de clientes
- `_PROMPT_HANDOFF_2026_01_10_STRIPE_CHECKOUT.md` - Integração Stripe
- `_PROMPT_HANDOFF_2026_01_16_CALENDAR_UX.md` - Calendário UX

---

## 🏗️ ARQUITETURA ATUAL

### Edge Functions (APENAS ESTAS 2)

```
supabase/functions/
├── rendizy-server/          ← Backend principal (750 deploys)
│   ├── index.ts             ← Entry point (CRÍTICO)
│   ├── routes-*.ts          ← Todas as rotas aqui
│   └── utils-*.ts           ← Utilitários compartilhados
│
└── rendizy-public/          ← Sites públicos (67 deploys)
    └── index.ts             ← Sem autenticação JWT
```

### Rotas Consolidadas em rendizy-server

| Rota | Método | Propósito |
|------|--------|-----------|
| `/health` | GET | Health check |
| `/staysnet/webhook/:orgId` | POST | Recebe webhooks Stays.net |
| `/cron/staysnet-webhooks` | POST | Processa webhooks pendentes |
| `/cron/staysnet-properties-sync` | POST | Sync propriedades |
| `/calendar-rules/batch` | GET/POST | Batch de regras calendário |
| `/reservations/*` | * | CRUD reservas |
| `/properties/*` | * | CRUD propriedades |
| `/guests/*` | * | CRUD hóspedes |
| `/blocks/*` | * | CRUD bloqueios |

### Cron Jobs (pg_cron)

| Job | Schedule | URL |
|-----|----------|-----|
| `rendizy-staysnet-properties-sync-morning` | 08:00 BRT | `/cron/staysnet-properties-sync` |
| `rendizy-staysnet-properties-sync-evening` | 20:00 BRT | `/cron/staysnet-properties-sync` |
| `rendizy-staysnet-webhooks-process` | */5 min | `/cron/staysnet-webhooks` |

---

## ⚠️ REGRAS CRÍTICAS

### 1. NUNCA Criar Novas Edge Functions

```
❌ PROIBIDO: Criar pasta em supabase/functions/
✅ CORRETO: Criar rota em rendizy-server/routes-*.ts
```

### 2. Hono usa Context, não Request

```typescript
// ❌ ERRADO
export async function handler(req: Request): Promise<Response> {
  const token = req.headers.get("x-auth-token"); // ERRO!
}

// ✅ CORRETO
export async function handler(c: Context): Promise<Response> {
  const token = c.req.header("x-auth-token");
  return c.json({ ok: true });
}
```

### 3. Deploy Sempre com Project Ref

```powershell
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

---

## 🧪 COMO TESTAR

### Health Check
```powershell
Invoke-RestMethod -Uri 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/health'
# Esperado: {"ok":true}
```

### Rota Protegida (sem token)
```powershell
$url = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/calendar-rules/batch'
Invoke-WebRequest -Uri $url -Method GET
# Esperado: 401 {"error":"Missing authentication token"}
```

### Cron Webhooks
```powershell
$sk = 'SERVICE_ROLE_KEY'
$url = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/cron/staysnet-webhooks'
Invoke-RestMethod -Uri $url -Method POST -Headers @{ 'apikey' = $sk; 'Authorization' = "Bearer $sk" } -Body '{}'
# Esperado: {"success":true,"data":{...}}
```

---

## 📊 COMMITS DESTA SESSÃO

1. `feat: add platform commission tracking + consolidate cron jobs`
2. `chore: delete deprecated Edge Functions`
3. `feat: consolidate all Edge Functions - final architecture (2 functions only)`
4. `fix: use Hono Context instead of Request in calendar-rules-batch`

---

## 🔜 POSSÍVEIS PRÓXIMOS PASSOS

1. **Monitoramento**: Verificar se webhooks continuam chegando corretamente
2. **Limpeza**: Remover pastas locais deprecated em `supabase/functions/`
3. **Frontend**: Atualizar dashboard para mostrar comissão separadamente
4. **Documentação**: Atualizar README principal com nova arquitetura

---

## 🚨 SE ALGO QUEBRAR

### Webhooks não processando
1. Verificar cron jobs: `SELECT * FROM cron.job WHERE jobname LIKE 'rendizy-%'`
2. Verificar logs: Supabase Dashboard > Edge Functions > rendizy-server > Logs
3. Chamar manualmente: `POST /cron/staysnet-webhooks`

### Erro 500 em rota
1. Verificar se handler usa `Context` (não `Request`)
2. Verificar imports no `index.ts`
3. Re-deploy: `supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc`

---

**LEMBRE-SE**: Este projeto teve problemas sérios por IAs criando Edge Functions separadas.
**LER OBRIGATORIAMENTE**: `docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md`
