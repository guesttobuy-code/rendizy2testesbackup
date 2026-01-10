# 🔄 Staysnet Properties Sync

> **Versão:** v1.0.111  
> **Data:** 2026-01-10  
> **Autor:** GitHub Copilot  

---

## 📋 Resumo

Sistema de sincronização automática de propriedades entre Stays.net e Rendizy.
Criado porque **Stays.net NÃO envia webhooks quando novas propriedades são criadas**.

---

## 🤖 Robôs Criados

### 1. Auto-Fetch Property (inline no webhook)

**Arquivo:** `supabase/functions/rendizy-server/utils-staysnet-auto-fetch-property.ts`

**Função:** `tryAutoFetchAndImportPropertyFromStays()`

**Quando executa:** Durante processamento de webhook de reserva, se a propriedade não existir localmente.

**Fluxo:**
1. Webhook de reserva chega com `listingId`
2. Busca na tabela `properties` por `staysnet_id`
3. Se não encontrar → chama API Stays `/content/listings/{id}`
4. Importa a propriedade via RPC `save_anuncio_field`
5. Retorna o `propertyId` para continuar o fluxo

**Retorno:**
```typescript
interface AutoFetchPropertyResult {
  success: boolean;
  propertyId?: string;
  error?: string;
  mode: 'found_local' | 'fetched_api' | 'not_found';
}
```

---

### 2. Import Issues Registry

**Arquivo:** `supabase/functions/rendizy-server/utils-staysnet-import-issues.ts`

**Funções:**
- `upsertStaysnetImportIssueMissingPropertyMapping()` - Registra problema
- `resolveStaysnetImportIssue()` - Resolve problema após sucesso

**Tabela:** `staysnet_import_issues`

**Quando usa:**
- Registra quando propriedade não é encontrada (nem local, nem API)
- Resolve automaticamente após upsert bem-sucedido da reserva

---

### 3. Properties Sync Cron (2x/dia)

**Arquivo:** `supabase/functions/staysnet-properties-sync-cron/index.ts`

**Quando executa:** 08:00 e 20:00 BRT (via pg_cron)

**Fluxo:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    STAYSNET PROPERTIES SYNC CRON                │
├─────────────────────────────────────────────────────────────────┤
│  1. Listar todas organizações com Stays.net conectado          │
│  2. Para cada org: chamar API /content/listings                 │
│  3. Comparar com properties locais (staysnet_id)                │
│  4. Detectar propriedades novas (não existem localmente)        │
│  5. Importar propriedades novas via RPC save_anuncio_field      │
│  6. Registrar resultado em staysnet_sync_log                    │
└─────────────────────────────────────────────────────────────────┘
```

**Tabela de log:** `staysnet_sync_log`

```sql
CREATE TABLE staysnet_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_api_listings INT,
  total_local_properties INT,
  new_properties_detected INT,
  new_properties_imported INT,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 🗓️ Configuração pg_cron

```sql
-- Executar no Supabase SQL Editor
SELECT cron.schedule(
  'staysnet-properties-sync-morning',
  '0 11 * * *',  -- 08:00 BRT = 11:00 UTC
  $$SELECT net.http_post(
    'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
    '{}',
    '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'
  )$$
);

SELECT cron.schedule(
  'staysnet-properties-sync-evening',
  '0 23 * * *',  -- 20:00 BRT = 23:00 UTC
  $$SELECT net.http_post(
    'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/staysnet-properties-sync-cron',
    '{}',
    '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'
  )$$
);
```

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `utils-staysnet-auto-fetch-property.ts` | Auto-fetch inline no webhook |
| `utils-staysnet-import-issues.ts` | Registry de import issues |
| `staysnet-properties-sync-cron/index.ts` | Edge Function do cron |
| `migrations/20260110_create_staysnet_sync_log.sql` | Migration da tabela de log |

---

## 🔍 Contexto: Por que foi criado?

**Problema:** Reserva FE37J chegou via webhook mas propriedade não existia localmente.
O robô não registrou `import_issue` (skip silencioso).

**Root cause:** Stays.net NÃO envia webhooks para `listing.created` ou `property.created`.
Analisamos 1000+ webhooks e confirmamos: só existem eventos de reserva.

**Solução:**
1. Auto-fetch property durante webhook (se não existir)
2. SEMPRE registrar import_issue quando skip
3. Sync cron 2x/dia para detectar novas propriedades

---

## ✅ Status

- [x] utils-staysnet-auto-fetch-property.ts criado
- [x] utils-staysnet-import-issues.ts criado  
- [x] staysnet-properties-sync-cron Edge Function criada
- [x] Migration staysnet_sync_log criada
- [x] Deploy rendizy-server
- [x] Deploy staysnet-properties-sync-cron
- [ ] Configurar pg_cron jobs (pendente)
- [ ] PR #6 aguardando review

---

## 📝 Changelog

**v1.0.111** (2026-01-10)
- feat(staysnet): auto-fetch property from Stays API when missing
- feat(staysnet): always register import_issue on skip (never silent)
- feat(staysnet): resolve import_issue after successful upsert
- feat(staysnet): properties sync cron 2x/day
- feat(staysnet): staysnet_sync_log table for audit trail
