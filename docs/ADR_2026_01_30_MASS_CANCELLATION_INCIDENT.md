# ADR: Incidente de Cancelamento em Massa - 2026-01-30

## Status
**RESOLVIDO** - Correções implementadas, aguardando restauração e deploy

## Data
2026-01-30

## Contexto

Em 30/01/2026, foi detectado que **286 reservas** foram canceladas automaticamente pelo cron job de reconciliação. Todos os KPIs do dashboard estavam mostrando **zero** (check-ins, check-outs, in-house, novas reservas).

## Investigação

### Timeline do Incidente

| Data/Hora (BRT) | Evento | Impacto |
|-----------------|--------|---------|
| 29/01 18:02 | Reconciliação executada | 371 reservas marcadas como "deletadas", erro de schema |
| 29/01 18:08 | Reconciliação executada | 256 reservas canceladas |
| 29/01 18:10 | Reconciliação executada | 40 reservas canceladas |
| 29/01 23:58 | Reconciliação à meia-noite | **221 reservas canceladas** |
| **Total** | | **~517 tentativas de cancelamento** (muitas sobrepostas) |

### Logs de Reconciliação

```json
{
  "run_id": "7235baaa-955b-41f6-a1b8-f5debb4a9ad1",
  "started_at": "2026-01-29T23:58:27",
  "finished_at": "2026-01-30T00:00:53",
  "total_checked": 350,
  "found_deleted": 350,  // ⚠️ 100% das reservas marcadas como "deletadas"
  "action_cancelled": 221
}
```

### Causa Raiz Identificada

1. **API Key Inválida/Incompleta**
   - A configuração em `staysnet_config` contém apenas `api_key: "a5146970"` sem o `api_secret`
   - A API da Stays.net requer autenticação Basic com formato `api_key:api_secret`
   - Resultado: **401 Unauthorized** para todas as chamadas

2. **Lógica de Reconciliação Agressiva**
   - O código em `routes-cron-reconciliation.ts` (linhas 161-212) interpreta qualquer falha de API como "reserva não existe"
   - Quando `found=false && !error`, a reserva é considerada "órfã" e cancelada automaticamente
   - Não há retry ou validação de erro de autenticação

3. **Falta de Validação de Credenciais**
   - O cron executa mesmo com credenciais inválidas
   - Não há health check da API antes de iniciar reconciliação
   - Não há limite de cancelamentos por execução (safeguard)

### Código Problemático

```typescript
// routes-cron-reconciliation.ts, linha 161
if (!found && !error) {
  stats.foundDeleted++
  // ...
  // Cancela automaticamente se checkout é futuro
  if (!isReservationPast(reservation.check_out)) {
    await supabase.from('reservations').update({
      status: 'cancelled',
      cancellation_reason: 'Reserva deletada na Stays.net - cancelada automaticamente por reconciliação',
    })
  }
}
```

O problema está em `fetchStaysReservation()`:
```typescript
// Linha 91-93
if (response.status === 404) {
  return { found: false }  // ← Não distingue 401 de 404!
}
```

## Decisão

### Correções Imediatas (Urgente)

1. **Desabilitar o cron de reconciliação temporariamente**
2. **Corrigir a configuração da API** - Adicionar `api_secret` na tabela `staysnet_config`
3. **Restaurar reservas** - Usar dados de `staysnet_raw` para reverter cancelamentos

### Correções de Código

1. **Distinguir erros de autenticação de "não encontrado"**
   ```typescript
   if (response.status === 401 || response.status === 403) {
     return { found: false, error: 'API authentication failed' }
   }
   ```

2. **Adicionar health check antes de reconciliação**
   ```typescript
   const healthCheck = await testApiConnection(config)
   if (!healthCheck.success) {
     throw new Error('API connection failed - aborting reconciliation')
   }
   ```

3. **Adicionar safeguard de limite de cancelamentos**
   ```typescript
   const MAX_CANCELLATIONS_PER_RUN = 50
   if (stats.actionCancelled >= MAX_CANCELLATIONS_PER_RUN) {
     console.warn('⚠️ Cancellation limit reached - stopping')
     break
   }
   ```

4. **Adicionar flag de dry-run para reconciliação**
   ```typescript
   if (options.dryRun) {
     console.log(`[DRY-RUN] Would cancel: ${reservation.external_id}`)
     continue
   }
   ```

## Plano de Recuperação

### Passo 1: Identificar Reservas Afetadas
```sql
SELECT id, external_id, check_in, check_out, cancelled_at
FROM reservations
WHERE cancellation_reason LIKE '%reconciliação%'
  AND cancelled_at >= '2026-01-29'
ORDER BY cancelled_at
```

### Passo 2: Restaurar via staysnet_raw
As reservas têm o payload original em `staysnet_raw`. Podemos usar para:
1. Restaurar o status original
2. Validar que a reserva realmente existe na fonte

### Passo 3: Re-importar da API
Após corrigir as credenciais:
```bash
POST /api/staysnet/import-reservations
{
  "checkInFrom": "2026-01-01",
  "checkInTo": "2026-03-31",
  "forceUpdate": true
}
```

## Consequências

### Positivas
- Incidente detectado e causa raiz identificada
- Dados podem ser recuperados de `staysnet_raw`
- Oportunidade de adicionar safeguards

### Negativas
- KPIs incorretos por ~24 horas
- Possível impacto em comunicações automáticas (WhatsApp check-in/checkout)
- Bloqueios no calendário podem ter sido removidos

## Lições Aprendidas

1. **Credenciais devem ser validadas antes de operações críticas**
2. **Operações destrutivas (cancelamentos) precisam de safeguards**
3. **Distinguir erros de API de "dados não encontrados"**
4. **Logs detalhados de erro são essenciais para debugging**
5. **Considerar feature flags para operações críticas**

## Correções Implementadas (2026-01-30)

### 1. Script de Restauração
- Arquivo: `scripts/restore-reservations-incident-20260130.ps1`
- Valida cada reserva na API antes de restaurar
- Exibe preview e pede confirmação
- Mapeia status corretamente

### 2. Safeguards no Código de Reconciliação
Arquivo: `routes-cron-reconciliation.ts`

**a) Limite de cancelamentos por execução:**
```typescript
const MAX_CANCELLATIONS_PER_RUN = 10
const CANCELLATION_THRESHOLD_PERCENT = 5
```

**b) Distinção de erros de autenticação:**
```typescript
if (response.status === 401 || response.status === 403) {
  return { 
    found: false, 
    error: `Auth error ${response.status}`,
    authError: true  // ← Nova flag
  }
}
```

**c) Health check antes de processar:**
```typescript
const healthCheck = await checkStaysApiHealth(testReservation.external_id, config)
if (!healthCheck.healthy) {
  // Aborta reconciliação se API não está saudável
  return c.json(errorResponse('API health check failed'), 503)
}
```

**d) Tracking de auth errors:**
```typescript
interface ReconciliationStats {
  // ...
  authErrors: number
  cancellationLimitReached: boolean
}
```

### 3. Proteção contra cancelamentos em massa
- Aborta se % de cancelamentos > 5%
- Para após 10 cancelamentos
- Registra safeguard triggers nos logs

## Referências

- [routes-cron-reconciliation.ts](../supabase/functions/rendizy-server/routes-cron-reconciliation.ts) - Código do cron
- [restore-reservations-incident-20260130.ps1](../scripts/restore-reservations-incident-20260130.ps1) - Script de restauração
- [utils-staysnet-config.ts](../supabase/functions/rendizy-server/utils-staysnet-config.ts) - Config loader
- [staysnet_config](https://supabase.com/dashboard) - Configuração de API keys

## Autores
- Copilot (investigação automatizada)
- Time Rendizy

## Changelog
- 2026-01-30: ADR criado após investigação do incidente
- 2026-01-30: Implementados safeguards e script de restauração
