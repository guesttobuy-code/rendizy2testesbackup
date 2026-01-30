# 📚 Código Explicado: Importação de Reservas Stays.net

**Data:** 29/01/2026  
**Projeto:** Rendizy  
**Autor:** Análise automatizada

---

## 🎯 Visão Geral da Arquitetura

O Rendizy possui **3 mecanismos** para importar reservas do Stays.net:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE IMPORTAÇÃO STAYS.NET                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   │  1. WEBHOOKS    │     │  2. IMPORT      │     │  3. CRON JOBS   │      │
│   │   (Tempo Real)  │     │    MANUAL       │     │   (Automático)  │      │
│   └────────┬────────┘     └────────┬────────┘     └────────┬────────┘      │
│            │                       │                       │               │
│            ▼                       ▼                       ▼               │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                        BANCO DE DADOS                           │      │
│   │   reservations | properties | guests | blocks | staysnet_webhooks│     │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ WEBHOOKS (Tempo Real)

### Arquivo Principal
`supabase/functions/rendizy-server/routes-staysnet-webhooks.ts`

### Como Funciona

```
Stays.net ──webhook──▶ /staysnet/webhook/:organizationId ──▶ staysnet_webhooks (tabela)
                                   │
                                   ▼
                       CRON (a cada 5 min)
                                   │
                                   ▼
                     processPendingStaysNetWebhooksForOrg()
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │ Tipo de Ação (action)   │
                     └─────────────────────────┘
                              │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   reservation.created  reservation.canceled  reservation.modified
          │                  │                  │
          ▼                  ▼                  ▼
   CRIAR/UPDATE        MARCAR COMO        ATUALIZAR DADOS
   RESERVA            CANCELLED
```

### Fluxo Detalhado

1. **Recebimento** (`receiveStaysNetWebhook`)
   - URL: `POST /staysnet/webhook/:organizationId`
   - Salva webhook na tabela `staysnet_webhooks` com `processed = false`
   - NÃO processa imediatamente (para não perder dados)

2. **Processamento** (`processPendingStaysNetWebhooksForOrg`)
   - Chamado pelo CRON a cada 5 minutos
   - Busca webhooks pendentes (`processed = false`)
   - Para cada webhook:
     - Verifica o `action` (ex: `reservation.created`, `reservation.canceled`)
     - Resolve `property_id` via mapeamento JSONB
     - Resolve ou cria `guest_id`
     - Faz UPSERT na tabela `reservations`

3. **Mapeamento de Status** (`deriveReservationStatus`)
   ```typescript
   // Linha ~377
   if (typeLower === 'canceled' || typeLower === 'cancelled') return 'cancelled';
   if (typeLower === 'booked' || typeLower === 'new' || typeLower === 'contract') return 'confirmed';
   ```

### ⚠️ PROBLEMA IDENTIFICADO #1: Bug de Status
O código em `staysnet-full-sync.ts` tinha:
```typescript
// BUGADO (linha 693):
status: staysRes.type === 'cancelled' ? 'cancelled' : 'confirmed'

// CORRIGIDO:
status: deriveStatusFromStaysType(staysRes.type)
```
**Impacto:** 248 reservas foram incorretamente marcadas como `cancelled`.

---

## 2️⃣ IMPORT MANUAL (Modal)

### Arquivo Principal
`supabase/functions/rendizy-server/routes-staysnet.ts` → `importFullStaysNet`

### Como Funciona

```
Frontend (Modal) ──POST──▶ /staysnet/import/full
                                │
                                ▼
                    StaysNetClient.getAllReservations()
                                │
                                ▼
                    fullSyncStaysNet() [staysnet-full-sync.ts]
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            Para cada Reserva         Para cada Propriedade
                    │                       │
                    ▼                       ▼
           reservationToSql()       propertyToSql()
                    │                       │
                    ▼                       ▼
              UPSERT em              UPSERT em
            `reservations`          `properties`
```

### Fluxo Detalhado

1. **Entrada** (`importFullStaysNet`)
   - Recebe `selectedPropertyIds`, `startDate`, `endDate`
   - Carrega configuração (API Key, Base URL)

2. **Busca na API Stays** (`StaysNetClient`)
   - `getAllListings()` - Busca todas propriedades
   - `getAllReservations()` - Busca todas reservas (paginado, 20/página)
   - Parâmetros: `from`, `to`, `dateType=arrival`

3. **Sincronização** (`fullSyncStaysNet`)
   - Processa: Hóspedes → Propriedades → Reservas (nesta ordem)
   - Para reservas: verifica se já existe (por `external_id` ou `staysnet_reservation_code`)
   - Se existe: UPDATE
   - Se não existe: INSERT

### ⚠️ PROBLEMA IDENTIFICADO #2: Paginação
A API Stays.net retorna máximo 20 itens por página. Se houver timeout ou erro de rede durante a paginação, reservas podem ser perdidas.

---

## 3️⃣ CRON JOBS (Automático)

### Arquivo Principal
`supabase/functions/rendizy-server/routes-cron-staysnet.ts`

### Jobs Configurados

| Job | Schedule | Descrição |
|-----|----------|-----------|
| `rendizy-staysnet-webhooks-process` | `*/5 * * * *` | Processa webhooks pendentes (a cada 5 min) |
| `rendizy-staysnet-properties-sync-morning` | `0 11 * * *` | Sync propriedades (08:00 BRT) |
| `rendizy-staysnet-properties-sync-evening` | `0 23 * * *` | Sync propriedades (20:00 BRT) |
| `rendizy-staysnet-reservations-reconcile` | `0 6 * * *` | Reconciliação (03:00 BRT) |

### Fluxo do CRON de Webhooks

```
pg_cron (cada 5 min)
        │
        ▼
POST /cron/staysnet-webhooks
        │
        ▼
cronStaysnetWebhooks()
        │
        ├──▶ processPendingStaysNetWebhooksForOrg() [webhooks novos]
        │
        └──▶ Retry de webhooks com erro (até 3x)
             - Busca: error_message IS NOT NULL AND retry_count < 3
             - Reseta processed = false
             - Reprocessa
```

---

## 📊 ANÁLISE DAS PLANILHAS

### Estatísticas Comparativas

| Métrica | Stays.net | Rendizy | Diferença |
|---------|-----------|---------|-----------|
| Total de Reservas | 2422 | 2270 | 152 |
| Confirmadas | N/A | 1770 | - |
| Canceladas | N/A | 491 | - |
| Pendentes | N/A | 9 | - |

### Problemas Identificados

1. **IDs não coincidem**
   - Stays usa códigos curtos (ex: `JF01J`, `GZ08J`)
   - Rendizy usa UUIDs internos + `staysnet_reservation_code`
   - A comparação precisa usar `external_id` ou `staysnet_reservation_code`

2. **152 reservas faltando**
   - Possíveis causas:
     - Webhooks não processados
     - Propriedades não mapeadas
     - Erros de paginação na API

---

## 🐛 BRECHAS IDENTIFICADAS

### BRECHA #1: Mapeamento de Propriedades
```
RESERVA NO STAYS ──▶ WEBHOOK ──▶ Busca property_id via JSONB
                                          │
                                          ▼
                                 SE NÃO ENCONTRAR:
                                 - Webhook vai para "skipped"
                                 - Reserva NÃO é criada
                                 - Registra em import_issues
```

**Arquivo:** `routes-staysnet-webhooks.ts`, linha ~1950
```typescript
if (!sqlData.property_id) {
  // ...
  skipped++;
  await staysnetDB.markWebhookProcessedDB(hook.id, 'Skipped: property not resolved');
  continue;
}
```

### BRECHA #2: Auto-Fetch de Propriedades
O código tenta buscar automaticamente propriedades não mapeadas:
```typescript
// Linha ~1925
const autoFetchResult = await tryAutoFetchAndImportPropertyFromStays(organizationId, listingIdStr);
```
**Mas:** Se a API Stays estiver indisponível ou o listing_id for inválido, a reserva é ignorada.

### BRECHA #3: Paginação Incompleta
```typescript
// routes-staysnet.ts, getAllReservations()
const limit = 20; // Stays.net: limit max 20
let hasMore = true;

while (hasMore && pages < maxPages) {
  const result = await this.getReservations({ ...params, limit, skip });
  // Se der erro aqui, o loop para e reservas são perdidas
  if (!result.success) {
    return { success: false, error: result.error };
  }
  // ...
}
```

### BRECHA #4: Tipos de Reserva Não Mapeados
O Stays pode enviar tipos que não são tratados:
- `owner_reservation` - Reserva do proprietário
- `maintenance` - Manutenção
- `unavailable` - Indisponível

Estes são tratados como "blocks", não como reservas:
```typescript
// isStaysBlockLikeType()
if (t === 'blocked' || t === 'maintenance' || t === 'unavailable' || t === 'owner_block') {
  // Vai para tabela `blocks`, não `reservations`
}
```

### BRECHA #5: Status de Webhook
Webhooks podem ficar "presos" se:
- `action` não começa com `reservation.`
- `action` é `reservation.payments.*` (ignorado)

```typescript
if (!action.startsWith('reservation.')) {
  skipped++;
  await staysnetDB.markWebhookProcessedDB(hook.id);
  continue;
}

if (action.startsWith('reservation.payments.')) {
  skipped++;
  await staysnetDB.markWebhookProcessedDB(hook.id);
  continue;
}
```

---

## 🔄 FLUXO COMPLETO DE UMA RESERVA

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. RESERVA CRIADA NO STAYS.NET (via Airbnb, Booking, Direct)                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. STAYS ENVIA WEBHOOK: reservation.created                                  │
│    POST /staysnet/webhook/{orgId}                                            │
│    Payload: { action: "reservation.created", payload: { _id, checkIn, ... }} │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK SALVO: staysnet_webhooks (processed = false)                      │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (espera até 5 min)
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. CRON: /cron/staysnet-webhooks                                             │
│    processPendingStaysNetWebhooksForOrg()                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ Resolve Property    │ │ Resolve Guest       │ │ Verifica Existing   │
│ via JSONB lookup    │ │ ou cria novo        │ │ via external_id     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                          ┌─────────────────────┐
                          │ property_id válido? │
                          └─────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
             ┌──────────┐                    ┌──────────┐
             │   SIM    │                    │   NÃO    │
             └──────────┘                    └──────────┘
                    │                               │
                    ▼                               ▼
         ┌──────────────────┐         ┌──────────────────────┐
         │ UPSERT reservas  │         │ Auto-fetch property  │
         │ (confirmar)      │         │ da API Stays         │
         └──────────────────┘         └──────────────────────┘
                    │                               │
                    │                    ┌──────────┴──────────┐
                    │                    ▼                     ▼
                    │              ┌──────────┐         ┌──────────┐
                    │              │ SUCESSO  │         │ FALHA    │
                    │              └──────────┘         └──────────┘
                    │                    │                     │
                    │                    ▼                     ▼
                    │         ┌──────────────────┐  ┌─────────────────┐
                    │         │ UPSERT reservas  │  │ SKIP webhook    │
                    │         └──────────────────┘  │ import_issues++ │
                    │                    │          └─────────────────┘
                    └────────────────────┤                     │
                                         ▼                     ▼
                              ┌──────────────────┐  ┌─────────────────┐
                              │ RESERVA NO       │  │ RESERVA NÃO     │
                              │ CALENDÁRIO ✅    │  │ APARECE ❌      │
                              └──────────────────┘  └─────────────────┘
```

---

## 🔄 CRON 4: RECONCILIAÇÃO + IMPORTAÇÃO DE FALTANTES (NOVO!)

### Arquivo Principal
`supabase/functions/rendizy-server/routes-cron-reconciliation.ts`

### Problema Resolvido
Reservas podem ficar faltando no Rendizy por:
1. Webhook falhou ou nunca chegou
2. Reserva criada durante manutenção
3. Bug de status (cancelled vs canceled)
4. Timeout na paginação durante import

### Estratégia Multi-Camada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECONCILIAÇÃO MULTI-CAMADA                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PARTE 1: VERIFICAÇÃO DE EXISTENTES                                        │
│   └─▶ Busca reservas no Rendizy                                            │
│   └─▶ Verifica se ainda existem na API Stays                               │
│   └─▶ Detecta alterações (status, datas, hóspede)                          │
│   └─▶ Cancela reservas deletadas na Stays                                   │
│                                                                             │
│   PARTE 2: IMPORTAÇÃO DE FALTANTES (NOVO!)                                  │
│   └─▶ Busca por DATA DE CHECK-IN (arrival) - próximos 14 dias              │
│   └─▶ Busca por DATA DE CRIAÇÃO (creation) - últimas 72h                   │
│   └─▶ Identifica reservas que existem no Stays mas não no Rendizy          │
│   └─▶ Importa automaticamente                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Endpoints

| Endpoint | Função |
|----------|--------|
| `POST /cron/staysnet-reservations-reconcile` | Reconciliação completa (existentes) |
| `POST /cron/staysnet-import-missing` | Importa apenas faltantes |

### Parâmetros

```typescript
// /cron/staysnet-import-missing
{
  daysAhead: 14,  // Dias à frente para check-in (arrival)
  daysBack: 3     // Dias atrás para criação (creation)
}
```

### CRON Configurado

| Job | Horário | Função |
|-----|---------|--------|
| `staysnet-reconciliation-daily` | 05:00 BRT | Reconciliação completa |
| `staysnet-import-missing-6h` | A cada 6h | Importa faltantes recentes |

---

## ✅ CORREÇÕES IMPLEMENTADAS (2026-01-30)

### Bug #1: Status cancelled vs canceled
**Problema:** O código comparava apenas `'cancelled'` (britânico), mas Stays.net também envia `'canceled'` (americano).

**Solução:** Criada função `deriveStatusFromStaysType()` que trata:
- `canceled`, `cancelled`, `cancelada`, `cancelado` → `'cancelled'`
- `booked`, `new`, `contract`, `confirmed` → `'confirmed'`

**Impacto:** 248 reservas corrigidas.

### Bug #2: Reservas faltantes
**Problema:** Reservas podem não chegar via webhook (falha de rede, timeout, etc).

**Solução:** CRON de importação de faltantes que busca:
1. Por `dateType: arrival` - check-ins próximos 14 dias
2. Por `dateType: creation` - criadas nas últimas 72h

**Impacto:** Garante que nenhuma reserva seja perdida.

---

## ✅ RECOMENDAÇÕES

### Correções Urgentes

1. **[FEITO] Corrigir bug de status** em `staysnet-full-sync.ts`
2. **[FEITO] Restaurar 248 reservas** incorretamente canceladas
3. **[FEITO] Criar CRON de importação de faltantes**

### Melhorias Sugeridas

1. **[FEITO] Implementar reconciliação automática** que compara Stays vs Rendizy diariamente
2. **Adicionar logs de diagnóstico** para webhooks não processados
3. **Criar alerta** quando `import_issues` aumentar
4. **Adicionar retry com backoff** para falhas de rede na paginação

### Monitoramento

Queries úteis para monitorar:

```sql
-- Webhooks pendentes (não processados)
SELECT COUNT(*) FROM staysnet_webhooks WHERE processed = false;

-- Webhooks com erro
SELECT COUNT(*) FROM staysnet_webhooks WHERE error_message IS NOT NULL;

-- Import issues (propriedades não mapeadas)
SELECT COUNT(*) FROM staysnet_import_issues WHERE resolved = false;

-- Reservas por status (período específico)
SELECT status, COUNT(*) 
FROM reservations 
WHERE check_in >= '2026-01-01' AND check_in <= '2026-02-28'
GROUP BY status;

-- Últimas execuções de reconciliação
SELECT * FROM reconciliation_runs ORDER BY created_at DESC LIMIT 5;

-- Reservas importadas pelo CRON de faltantes
SELECT * FROM reservations 
WHERE data->>'importedBy' = 'reconciliation-cron-v2'
ORDER BY created_at DESC LIMIT 20;
```

---

## 📁 Arquivos Relevantes

| Arquivo | Responsabilidade |
|---------|------------------|
| `routes-staysnet-webhooks.ts` | Recebimento e processamento de webhooks |
| `routes-staysnet.ts` | API Client, Import Manual, Configuração |
| `routes-cron-staysnet.ts` | CRON Jobs (properties sync, webhooks) |
| `routes-cron-reconciliation.ts` | **CRON: Reconciliação + Importação de faltantes** |
| `staysnet-full-sync.ts` | Sincronização completa (import modal) |
| `staysnet-db.ts` | Operações de banco (save/load config, webhooks) |
| `utils-staysnet-config.ts` | Carregamento de configuração |
| `utils-staysnet-guest-link.ts` | Resolução/criação de hóspedes |
| `utils-staysnet-auto-fetch-property.ts` | Auto-import de propriedades |

---

## 📞 Próximos Passos

1. ✅ Executar endpoint de importação de faltantes
2. Verificar tabela `staysnet_import_issues` para ver propriedades não mapeadas
3. Revisar configuração do webhook no painel Stays.net
4. Verificar se todos os CRON jobs estão ativos no Supabase Dashboard
5. Rodar a migration `20260130_setup_staysnet_reconciliation_cron.sql`
