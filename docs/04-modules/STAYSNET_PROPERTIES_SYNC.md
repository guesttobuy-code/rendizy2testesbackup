# Stays.net Properties Sync - Sincronização Automática de Imóveis

> **Versão**: 1.0.111  
> **Data**: 2026-01-10  
> **Autor**: GitHub Copilot  

## Problema Resolvido

A Stays.net **NÃO envia webhooks** quando uma nova propriedade é criada. Isso causa dessincronização: imóveis existem na Stays mas não aparecem no Rendizy.

### Evidência

Análise dos webhooks recebidos na última semana (10/jan/2026):

| Tipo de Webhook | Count |
|-----------------|-------|
| `message.added` | 501 |
| `calendar.rates.modified` | 131 |
| `calendar.restrictions.modified` | 125 |
| `reservation.payments.modified` | 64 |
| `reservation.modified` | 48 |
| `reservation.payments.created` | 48 |
| `reservation.created` | 38 |
| `client.created` | 23 |
| `reservation.payments.deleted` | 10 |
| `reservation.canceled` | 7 |
| `reservation.deleted` | 5 |

**Nenhum evento `listing.*` ou `property.*` foi encontrado.**

## Solução Implementada

### Componentes

1. **Edge Function**: `staysnet-properties-sync-cron`
   - Caminho: `supabase/functions/staysnet-properties-sync-cron/index.ts`
   - Propósito: Sincroniza propriedades entre Stays.net e Rendizy

2. **Tabela de Log**: `staysnet_sync_log`
   - Migration: `20260110_create_staysnet_sync_log.sql`
   - Registra cada execução do cron

3. **Módulo de Rotas** (opcional): `routes-staysnet-properties-sync.ts`
   - Para uso interno via rendizy-server

### Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRON (08:00 e 20:00 BRT)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Buscar organizações com staysnet_config.enabled = true      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Para cada organização:                                       │
│     a. GET /content/listings (API Stays.net)                    │
│     b. Buscar properties.data.externalIds.staysnet_listing_id   │
│     c. Comparar e identificar propriedades novas                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Importar propriedades novas via RPC save_anuncio_field      │
│     - Status: 'draft' (para revisão manual)                     │
│     - importSource: 'staysnet_sync_cron'                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Registrar em staysnet_sync_log                              │
└─────────────────────────────────────────────────────────────────┘
```

## Configuração do Cron

### Via pg_cron no Supabase

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 08:00 BRT (11:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-morning',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
      '{}',
      '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);

-- 20:00 BRT (23:00 UTC)
SELECT cron.schedule(
  'staysnet-properties-sync-evening',
  '0 23 * * *',
  $$
    SELECT net.http_post(
      'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
      '{}',
      '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

### Verificar Jobs Agendados

```sql
SELECT * FROM cron.job;
```

### Remover Jobs

```sql
SELECT cron.unschedule('staysnet-properties-sync-morning');
SELECT cron.unschedule('staysnet-properties-sync-evening');
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Sim |
| `STAYSNET_CRON_SECRET` | Secret para autenticação do cron | Não |

## API

### POST /staysnet-properties-sync-cron

Executa sincronização de propriedades.

**Request Body (opcional)**:
```json
{
  "organizationId": "uuid" // Se não informado, sincroniza todas as orgs
}
```

**Response**:
```json
{
  "success": true,
  "message": "Properties sync completed",
  "summary": {
    "organizations": 1,
    "newPropertiesFound": 2,
    "imported": 2,
    "errors": 0
  },
  "details": [
    {
      "organizationId": "00000000-0000-0000-0000-000000000000",
      "staysCount": 45,
      "rendizyCount": 43,
      "newProperties": ["listing_id_1", "listing_id_2"],
      "imported": 2,
      "errors": [],
      "executedAt": "2026-01-10T11:00:00.000Z"
    }
  ]
}
```

## Monitoramento

### Query: Últimos Syncs

```sql
SELECT 
  organization_id,
  stays_count,
  rendizy_count,
  new_count,
  imported_count,
  array_length(errors, 1) as error_count,
  executed_at
FROM staysnet_sync_log
ORDER BY executed_at DESC
LIMIT 20;
```

### Query: Propriedades Faltando

```sql
-- Comparar IDs Stays com IDs no Rendizy
WITH stays_ids AS (
  -- Esta query requer acesso à API Stays
  -- Use o endpoint /staysnet/properties-sync-status
  SELECT unnest(ARRAY['id1', 'id2']) as stays_id
),
rendizy_ids AS (
  SELECT 
    data->'externalIds'->>'staysnet_listing_id' as stays_id
  FROM properties
  WHERE organization_id = '00000000-0000-0000-0000-000000000000'
)
SELECT s.stays_id
FROM stays_ids s
LEFT JOIN rendizy_ids r ON s.stays_id = r.stays_id
WHERE r.stays_id IS NULL;
```

## Tratamento de Erros

1. **Falha na API Stays.net**: Registrado em `errors[]`, sync continua para outras orgs
2. **Falha no import**: Registrado em `errors[]`, continua para outras propriedades
3. **Org sem config**: Pulada silenciosamente

## Relacionamento com Outros Módulos

- **utils-staysnet-auto-fetch-property.ts**: Import individual de propriedades (usado em webhooks)
- **import-staysnet-properties.ts**: Import via modal (seleção manual)
- **staysnet_import_issues**: Tracking de problemas de import

## Changelog

### v1.0.111 (2026-01-10)
- ✅ Criada Edge Function `staysnet-properties-sync-cron`
- ✅ Criada tabela `staysnet_sync_log`
- ✅ Documentação completa
- ✅ Configuração de cron para 08:00 e 20:00 BRT
