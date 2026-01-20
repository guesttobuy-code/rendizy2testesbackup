# 📚 STAYSNET WEBHOOK - DOCUMENTAÇÃO DE REFERÊNCIA

**Versão:** 1.0.0  
**Data:** 2026-01-18  
**Status:** ✅ FUNCIONANDO CORRETAMENTE  
**Autor:** Documentação gerada após correções de bugs críticos  

---

## 📋 SUMÁRIO

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Fluxo de Dados](#3-fluxo-de-dados)
4. [Funções Críticas (Código de Referência)](#4-funções-críticas-código-de-referência)
5. [Bugs Conhecidos e Soluções](#5-bugs-conhecidos-e-soluções)
6. [Estrutura de Dados](#6-estrutura-de-dados)
7. [Queries Úteis para Debug](#7-queries-úteis-para-debug)
8. [Checklist de Validação](#8-checklist-de-validação)

---

## 1. VISÃO GERAL

### O que é?
Sistema de integração que recebe webhooks do Stays.net e sincroniza reservas/bloqueios com o banco de dados do Rendizy.

### Arquivo Principal
```
supabase/functions/rendizy-server/routes-staysnet-webhooks.ts
```

### Endpoint
```
POST /staysnet/webhook/:organizationId
```

### Fluxo Resumido
```
Stays.net → Webhook → Rendizy Server → Banco de Dados (Supabase)
                          ↓
                    ┌─────────────────────────────────────┐
                    │ 1. Salva webhook na tabela          │
                    │ 2. Processa payload                 │
                    │ 3. Resolve property_id via lookup   │
                    │ 4. Upsert reserva/bloqueio          │
                    └─────────────────────────────────────┘
```

---

## 2. ARQUITETURA

### Tabelas Envolvidas

| Tabela | Descrição |
|--------|-----------|
| `staysnet_webhooks` | Armazena todos os webhooks recebidos |
| `reservations` | Reservas sincronizadas |
| `blocks` | Bloqueios de calendário |
| `properties` | Propriedades (contém mapeamento de IDs) |
| `guests` | Hóspedes das reservas |

### Campos Críticos em `properties.data`

O sistema busca o `property_id` através de lookup JSONB. Os campos verificados são:

```javascript
// Ordem de verificação (do mais específico ao mais genérico)
lookups = [
  'data.externalIds.staysnet_property_id',
  'data.externalIds.staysnet_listing_id',
  'data.staysnet_raw._id',
  'data.staysnet_raw.id',
  'data.codigo'
]
```

### Organização Padrão
```
Organization ID: 00000000-0000-0000-0000-000000000000
```

---

## 3. FLUXO DE DADOS

### 3.1 Recebimento do Webhook

```typescript
// 1. Webhook chega via POST
receiveStaysNetWebhook(c: Context)

// 2. Extrai dados
const action = body.action || 'unknown'
const payload = body.payload ?? body

// 3. Salva na tabela staysnet_webhooks
await staysnetDB.saveStaysNetWebhookDB(...)

// 4. Processa imediatamente (realtime)
await processPendingStaysNetWebhooksForOrg(organizationId, realtimeLimit)
```

### 3.2 Processamento do Webhook

```typescript
// processPendingStaysNetWebhooksForOrg()
1. Busca webhooks pendentes (processed_at IS NULL)
2. Para cada webhook:
   a. Extrai listingId do payload
   b. Resolve property_id via lookup JSONB
   c. Se encontrou → upsert reserva/bloqueio
   d. Se não encontrou → registra erro "property not resolved"
   e. Marca como processado
```

### 3.3 Lookup de Property (CRÍTICO)

```typescript
// resolveAnuncioDraftIdFromStaysId()
// Esta função é CRÍTICA - busca o property_id no banco

async function resolveAnuncioDraftIdFromStaysId(
  supabase,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  
  // ⚠️ IMPORTANTE: Normalizar IDs antes do lookup
  const normalizedStaysId = String(staysId || '').trim();
  
  const lookups = [
    { label: 'externalIds.staysnet_property_id', needle: { externalIds: { staysnet_property_id: normalizedStaysId } } },
    { label: 'externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: normalizedStaysId } } },
    { label: 'staysnet_raw._id', needle: { staysnet_raw: { _id: normalizedStaysId } } },
    { label: 'staysnet_raw.id', needle: { staysnet_raw: { id: normalizedStaysId } } },
    { label: 'codigo', needle: { codigo: normalizedStaysId } },
  ];

  for (const l of lookups) {
    const { data: row } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', normalizedOrgId)
      .contains('data', l.needle)  // ← JSONB contains lookup
      .maybeSingle();

    if (row?.id) return row.id;
  }

  return null;
}
```

---

## 4. FUNÇÕES CRÍTICAS (CÓDIGO DE REFERÊNCIA)

### 4.1 parseMoneyInt - Conversão de Preços

**⚠️ REGRA FUNDAMENTAL:** O Stays envia valores em **REAIS**, o Rendizy armazena em **CENTAVOS**.

```typescript
/**
 * Converte valor monetário para INTEIRO em CENTAVOS.
 * 
 * IMPORTANTE:
 * - Stays envia: 813.38 (REAIS)
 * - Rendizy armazena: 81338 (CENTAVOS)
 * 
 * @param value - Valor do Stays (em REAIS, pode ser string ou number)
 * @param fallback - Valor padrão se conversão falhar
 * @returns Valor em CENTAVOS (inteiro)
 */
function parseMoneyInt(value: any, fallback: number): number {
  const n = parseMoney(value, Number.NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100);  // ← MULTIPLICAR POR 100
}

/**
 * Converte valor monetário para número (REAIS).
 */
function parseMoney(value: any, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    // Remove símbolos de moeda e normaliza
    const cleaned = value
      .replace(/[R$\s,]/g, '')
      .replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
```

### 4.2 Extração de ListingId do Payload

```typescript
/**
 * Extrai o ID da propriedade (listing) do payload do webhook.
 * O Stays pode enviar em diversos campos diferentes.
 */
function extractListingCandidateFromStaysReservation(input: any): string | null {
  const r = unwrapStaysWebhookPayloadLike(input);
  
  // Campos diretos (ordem de prioridade)
  const direct =
    r?._idlisting ??      // Mais comum
    r?._id_listing ??
    r?.idlisting ??
    r?.id_listing ??
    r?.listingId ??
    r?.listing_id ??
    r?.propertyId ??
    r?.property_id ??
    null;
    
  if (direct) return String(direct);

  // Nested objects
  const nestedListing = r?.listing ?? r?.property ?? null;
  if (nestedListing && typeof nestedListing === 'object') {
    return nestedListing?._id ?? nestedListing?.id ?? null;
  }

  return null;
}
```

### 4.3 Derivação de Status

```typescript
/**
 * Deriva o status da reserva baseado no tipo/status do Stays.
 */
function deriveReservationStatus(input: { type?: string; status?: string }): string {
  const type = String(input?.type || '').toLowerCase().trim();
  const status = String(input?.status || '').toLowerCase().trim();

  // Cancelados
  if (type === 'canceled' || type === 'cancelled') return 'cancelled';
  if (status === 'canceled' || status === 'cancelled') return 'cancelled';

  // Confirmados
  if (type === 'new' || type === 'booked' || type === 'confirmed') return 'confirmed';
  if (status === 'confirmed' || status === 'booked') return 'confirmed';

  // Pendentes
  if (status === 'pending' || status === 'awaiting') return 'pending';

  // Default
  return 'confirmed';
}
```

### 4.4 Mapeamento Completo para SQL

```typescript
/**
 * Mapeia dados do Stays para formato SQL do Rendizy.
 * 
 * ATENÇÃO aos campos de preço - todos devem estar em CENTAVOS.
 */
function mapStaysReservationToSql(input, organizationId, resolvedPropertyId, resolvedGuestId, existing?) {
  
  // ... extração de datas e validação ...
  
  const priceObj = input?.price || {};
  const hostingDetails = priceObj?.hostingDetails || {};

  // ⚠️ TODOS os preços são convertidos para CENTAVOS
  const pricePerNight = parseMoneyInt(
    input?.pricePerNight ?? hostingDetails?._f_nightPrice,
    0
  );  // Resultado: CENTAVOS

  const accommodationTotal = parseMoney(priceObj?._f_expected, NaN);
  const resolvedBaseTotal = Number.isFinite(accommodationTotal)
    ? Math.round(accommodationTotal * 100)  // REAIS → CENTAVOS
    : pricePerNight * nights;

  const total = parseMoneyInt(priceObj?._f_total, resolvedBaseTotal);  // CENTAVOS

  return {
    id: existing?.id || crypto.randomUUID(),
    organization_id: organizationId,
    property_id: resolvedPropertyId,
    guest_id: resolvedGuestId,
    check_in: checkInDate,
    check_out: checkOutDate,
    nights,
    status: derivedStatus,
    
    // ⚠️ TODOS em CENTAVOS (INTEGER no banco)
    pricing_price_per_night: pricePerNight,
    pricing_base_total: resolvedBaseTotal,
    pricing_total: total,
    pricing_cleaning_fee: cleaningFee,
    pricing_service_fee: serviceFee,
    pricing_taxes: taxes,
    pricing_discount: discount,
    pricing_currency: currency,
    
    // Metadados do Stays
    staysnet_reservation_code: input?.id,  // Código curto (ex: "GM13J")
    staysnet_listing_id: listingId,
    staysnet_client_id: clientId,
    staysnet_type: rawType,
    staysnet_raw: input,  // Payload completo para debug
    
    // ... outros campos ...
  };
}
```

---

## 5. BUGS CONHECIDOS E SOLUÇÕES

### BUG 1: `bookingCode is not defined`

**Sintoma:** Erro no log: `ReferenceError: bookingCode is not defined`

**Causa:** Variável usada antes de ser declarada no escopo.

**Solução:**
```typescript
// ❌ ERRADO (variável não existe neste escopo)
console.log(`Processing reservation ${bookingCode}`);

// ✅ CORRETO (usar variável correta)
console.log(`Processing reservation ${staysReservationCode}`);
```

**Arquivo:** `routes-staysnet-webhooks.ts`  
**Data:** 2026-01-18

---

### BUG 2: Preços em REAIS ao invés de CENTAVOS

**Sintoma:** Dashboard mostra preços 100x menores que o correto.

**Causa:** `parseMoneyInt` não multiplicava por 100.

**Solução:**
```typescript
// ❌ ERRADO (retorna em REAIS)
function parseMoneyInt(value, fallback) {
  const n = parseMoney(value, NaN);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

// ✅ CORRETO (retorna em CENTAVOS)
function parseMoneyInt(value, fallback) {
  const n = parseMoney(value, NaN);
  return Number.isFinite(n) ? Math.round(n * 100) : fallback;  // × 100
}
```

**Migração SQL para dados existentes:**
```sql
UPDATE reservations
SET 
  pricing_price_per_night = pricing_price_per_night * 100,
  pricing_base_total = pricing_base_total * 100,
  pricing_cleaning_fee = pricing_cleaning_fee * 100,
  pricing_service_fee = pricing_service_fee * 100,
  pricing_taxes = pricing_taxes * 100,
  pricing_discount = pricing_discount * 100,
  pricing_total = pricing_total * 100
WHERE 
  pricing_total < 100000  -- Filtro de segurança
  AND staysnet_reservation_code IS NOT NULL;
```

**Arquivo:** `routes-staysnet-webhooks.ts`  
**Data:** 2026-01-18

---

### BUG 3: "property not resolved" para propriedades mapeadas

**Sintoma:** Webhooks falham com erro "property not resolved" mesmo quando a propriedade existe no banco.

**Causa:** O lookup JSONB não estava usando os campos corretos ou a query tinha problema de encoding.

**Diagnóstico:**
```sql
-- Verificar se a propriedade tem o mapeamento
SELECT id, data->'externalIds'->>'staysnet_listing_id' as listing_id
FROM properties
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND data->'externalIds'->>'staysnet_listing_id' IS NOT NULL;
```

**Solução:** Adicionar logs detalhados no lookup e normalizar IDs:
```typescript
async function resolveAnuncioDraftIdFromStaysId(supabase, organizationId, staysId) {
  // ⚠️ NORMALIZAÇÃO CRÍTICA
  const normalizedStaysId = String(staysId || '').trim();
  
  console.log(`[resolveAnuncioDraftIdFromStaysId] Buscando staysId=${normalizedStaysId}`);
  
  // ... lookup com logs ...
  
  if (row?.id) {
    console.log(`✅ Encontrado via ${l.label}: ${row.id}`);
    return row.id;
  }
}
```

**Arquivo:** `routes-staysnet-webhooks.ts`  
**Data:** 2026-01-18

---

### BUG 4: `staysnet_reservation_code` ficava NULL durante import

**Sintoma:** Reservas importadas via sync tinham `staysnet_reservation_code = NULL`, mesmo tendo `staysnet_raw.id` correto.

**Causa:** O bloco de compatibilidade (retry para colunas ausentes) usava regex genérico que removia MÚLTIPLAS colunas do payload, não apenas a coluna faltante.

**Código problemático:**
```typescript
// ❌ ERRADO (removia todas as colunas que casavam com regex genérico)
const candidates = [
  'source_created_at',
  'staysnet_raw',
  'staysnet_listing_id',
  'staysnet_client_id',
  'staysnet_reservation_code',  // ← Era removida indevidamente!
  'staysnet_partner_code',
  // ...
];

for (const k of candidates) {
  if (new RegExp(String(k), 'i').test(msg)) dropKeys.push(k);
}
```

**Solução:**
```typescript
// ✅ CORRETO (extrai APENAS a coluna específica mencionada no erro)
const colMatch = msg.match(/column[^"]*"([^"]+)"[^"]*does not exist/i);
const missingColumn = colMatch?.[1];

if (missingColumn && (reservationData)[missingColumn] !== undefined) {
  delete reservationDataCompat[missingColumn];  // Remove SÓ a coluna faltante
}
```

**Migração para dados existentes:**
```sql
-- Corrigir reservas que ficaram com staysnet_reservation_code NULL
UPDATE reservations r
SET staysnet_reservation_code = (staysnet_raw->>'id')
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND staysnet_raw IS NOT NULL
  AND staysnet_reservation_code IS NULL
  AND staysnet_raw->>'id' IS NOT NULL;
```

**Impacto:** 221 reservas foram corrigidas.

**Arquivo:** `import-staysnet-reservations.ts`  
**Data:** 2026-01-18

---

### BUG 5: Bloqueios deletados no Stays não eram removidos no Rendizy

**Sintoma:** Ao criar e depois deletar um bloqueio (block) no Stays.net, o bloqueio permanecia no calendário do Rendizy.

**Evidência no Banco:**
```sql
-- Webhook recebido mas falhou em deletar o bloco
SELECT id, action, error_message, payload->>'_id' as stays_id
FROM staysnet_webhooks
WHERE action = 'reservation.deleted'
  AND error_message LIKE '%no matching%';
```

**Causa:** O webhook `reservation.deleted` para bloqueios usa formato de datas diferente:
- **Criação**: `checkInDate`, `checkOutDate`
- **Deleção**: `from`, `to`

A função `extractYmdRangeFromStaysLike` não suportava `from`/`to`, então as datas vinham como `null` e a query de deleção não encontrava match.

**Payload de criação de bloqueio:**
```json
{
  "action": "reservation.created",
  "payload": {
    "_id": "696d19c9a90f0282b07c8f46",
    "type": "blocked",
    "_idlisting": "6706800de5d759250265592e",
    "checkInDate": "2026-01-28",
    "checkOutDate": "2026-01-29"
  }
}
```

**Payload de deleção de bloqueio:**
```json
{
  "action": "reservation.deleted",
  "payload": {
    "_id": "696d19c9a90f0282b07c8f46",
    "_idlisting": "6706800de5d759250265592e",
    "from": "2026-01-28",
    "to": "2026-01-29"
  }
}
```

**Solução:**
```typescript
// ❌ ANTES (não suportava from/to)
function extractYmdRangeFromStaysLike(input: any) {
  const r = unwrapStaysWebhookPayloadLike(input);
  const start = toYmd(r?.checkInDate ?? r?.checkIn ?? r?.check_in ?? r?.startDate ?? r?.start_date ?? null);
  const end = toYmd(r?.checkOutDate ?? r?.checkOut ?? r?.check_out ?? r?.endDate ?? r?.end_date ?? null);
  return { startDate: start, endDate: end };
}

// ✅ DEPOIS (suporta from/to usado em deleções de bloqueio)
function extractYmdRangeFromStaysLike(input: any) {
  const r = unwrapStaysWebhookPayloadLike(input);
  // ⚠️ IMPORTANTE: Stays usa "from"/"to" em webhooks de deleção de bloqueios
  const start = toYmd(r?.checkInDate ?? r?.checkIn ?? r?.check_in ?? r?.startDate ?? r?.start_date ?? r?.from ?? null);
  const end = toYmd(r?.checkOutDate ?? r?.checkOut ?? r?.check_out ?? r?.endDate ?? r?.end_date ?? r?.to ?? null);
  return { startDate: start, endDate: end };
}
```

**Limpeza de bloqueio órfão (se necessário):**
```sql
-- Deletar bloco órfão que não foi removido pelo webhook
DELETE FROM blocks
WHERE reason ILIKE '%Stays.net%'
  AND notes::text ILIKE '%"_id":"<STAYS_BLOCK_ID>"%';
```

**Arquivo:** `routes-staysnet-webhooks.ts` (função `extractYmdRangeFromStaysLike`)  
**Data:** 2026-01-18

---

## 6. ESTRUTURA DE DADOS

### 6.1 Payload do Webhook (Exemplo)

```json
{
  "action": "reservation.created",
  "payload": {
    "id": "GM13J",
    "_id": "6809942ed1b6cc4146b10dd4",
    "type": "new",
    "_idlisting": "646e845f4b8d92742a2232d4",
    "_idclient": "6809942ed1b6cc4146b10d8d",
    "checkInDate": "2026-02-13",
    "checkOutDate": "2026-02-18",
    "checkInTime": "14:00",
    "checkOutTime": "12:00",
    "guests": 6,
    "guestsDetails": {
      "adults": 6,
      "children": 0,
      "infants": 0
    },
    "price": {
      "_f_total": 5120.70,
      "_f_expected": 4902.65,
      "currency": "BRL",
      "hostingDetails": {
        "_f_nightPrice": 3720.70,
        "_f_total": 5120.70,
        "fees": [
          { "name": "Additional Guests Fee", "_f_val": 1400 }
        ]
      }
    },
    "partner": {
      "_id": "5d1b5cbec62b271c78796479",
      "name": "API booking.com"
    },
    "partnerCode": "4853204992",
    "reservationUrl": "https://bvm.stays.net/i/..."
  }
}
```

### 6.2 Registro em `reservations` (Resultado)

```json
{
  "id": "d1deb815-420c-46a3-b553-ff9060e8f658",
  "organization_id": "00000000-0000-0000-0000-000000000000",
  "property_id": "cbd9e68a-bba4-4a30-9e5b-22832717abd3",
  "guest_id": "8fa9927e-eab9-4a38-afc9-d41e02892a1f",
  "check_in": "2026-02-13",
  "check_out": "2026-02-18",
  "nights": 5,
  "status": "confirmed",
  "platform": "booking",
  
  "pricing_price_per_night": 372070,
  "pricing_base_total": 490265,
  "pricing_total": 512070,
  "pricing_currency": "BRL",
  
  "staysnet_reservation_code": "GM13J",
  "staysnet_listing_id": "646e845f4b8d92742a2232d4",
  "staysnet_client_id": "6809942ed1b6cc4146b10d8d",
  "staysnet_type": "new",
  "staysnet_raw": { /* payload completo */ }
}
```

### 6.3 Mapeamento de Propriedades

```json
// properties.data (campo JSONB)
{
  "externalIds": {
    "staysnet_listing_id": "646e845f4b8d92742a2232d4",
    "staysnet_property_id": "646e845f4b8d92742a2232d4"
  },
  "staysnet_raw": {
    "_id": "646e845f4b8d92742a2232d4",
    "id": "PROP123"
  }
}
```

---

## 7. QUERIES ÚTEIS PARA DEBUG

### 7.1 Verificar Webhooks Pendentes

```sql
SELECT id, action, payload->>'_idlisting' as listing_id, created_at
FROM staysnet_webhooks
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND processed_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

### 7.2 Verificar Webhooks com Erro

```sql
SELECT id, action, error_message, payload->>'_idlisting' as listing_id
FROM staysnet_webhooks
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND error_message IS NOT NULL
  AND error_message NOT LIKE '%upserted block%'
  AND error_message NOT LIKE '%Cancellation applied%'
ORDER BY created_at DESC
LIMIT 50;
```

### 7.3 Verificar Mapeamento de Propriedades

```sql
SELECT 
  id,
  data->>'nome' as nome,
  data->'externalIds'->>'staysnet_listing_id' as staysnet_listing_id
FROM properties
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND data->'externalIds'->>'staysnet_listing_id' IS NOT NULL;
```

### 7.4 Dashboard Hoje

```sql
-- Check-ins hoje
SELECT COUNT(*) as checkins_hoje
FROM reservations
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND check_in = CURRENT_DATE
  AND status IN ('confirmed', 'pending');

-- Check-outs hoje
SELECT COUNT(*) as checkouts_hoje
FROM reservations
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND check_out = CURRENT_DATE
  AND status IN ('confirmed', 'pending');

-- In-house hoje
SELECT COUNT(*) as inhouse_hoje
FROM reservations
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND check_in <= CURRENT_DATE
  AND check_out > CURRENT_DATE
  AND status IN ('confirmed', 'pending');
```

### 7.5 Verificar Preços (CENTAVOS)

```sql
SELECT 
  staysnet_reservation_code,
  pricing_total,
  (staysnet_raw->'price'->>'_f_total')::numeric as stays_total_reais,
  ROUND((staysnet_raw->'price'->>'_f_total')::numeric * 100) as expected_centavos,
  CASE 
    WHEN pricing_total = ROUND((staysnet_raw->'price'->>'_f_total')::numeric * 100) 
    THEN '✅' ELSE '❌' 
  END as match
FROM reservations
WHERE staysnet_raw IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

### 7.6 Reprocessar Webhooks com Erro

```sql
-- Limpar erro para reprocessar
UPDATE staysnet_webhooks
SET processed_at = NULL, error_message = NULL
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND error_message LIKE '%property not resolved%';
```

---

## 8. CHECKLIST DE VALIDAÇÃO

Após qualquer alteração no código de webhooks, verifique:

### ✅ Webhooks

- [ ] Webhooks pendentes = 0
- [ ] Nenhum erro "property not resolved"
- [ ] Nenhum erro "bookingCode is not defined"

### ✅ Reservas

- [ ] Reservas têm `property_id` preenchido
- [ ] Preços estão em CENTAVOS (valores > 10000 para reservas típicas)
- [ ] Status correto (confirmed/cancelled/pending)

### ✅ Dashboard

- [ ] Check-ins/check-outs/in-house mostram números > 0
- [ ] Bloqueios ativos mostram corretamente

### ✅ Deploy

```bash
# Comando de deploy
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Verificar versão
# Deve aparecer nova versão no log
```

---

## 📝 HISTÓRICO DE ALTERAÇÕES

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-18 | 1.0.0 | Documentação inicial após correção de bugs críticos |

---

## 🔗 REFERÊNCIAS

- **Arquivo principal:** `supabase/functions/rendizy-server/routes-staysnet-webhooks.ts`
- **Governança:** `docs/04-modules/STAYSNET_INTEGRATION_GOVERNANCE.md`
- **Supabase Project:** `odcgnzfremrqnvtitpcc`
- **Deploy:** `supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc`

---

> **⚠️ IMPORTANTE:** Este documento serve como referência de código funcional. Se houver problemas futuros, compare com as implementações documentadas aqui.
