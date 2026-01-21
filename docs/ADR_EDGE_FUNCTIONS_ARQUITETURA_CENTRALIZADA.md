# ADR: Arquitetura Centralizada de Edge Functions

**Status**: ✅ APROVADO  
**Data**: 2026-01-21 (Atualizado)  
**Autor**: Equipe Rendizy  
**Revisão Obrigatória Por**: Qualquer IA que trabalhe neste projeto

---

## ⚠️ AVISO CRÍTICO PARA IAs

> **NUNCA CRIE EDGE FUNCTIONS SEPARADAS SEM AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO.**
> 
> Este projeto JÁ sofreu com problemas graves causados por IAs que criaram múltiplas
> Edge Functions sem permissão. O resultado foi 20+ dias sem receber webhooks corretamente.
> 
> **SE VOCÊ ESTÁ LENDO ISSO**: Não crie functions em `supabase/functions/` além das permitidas.

---

## 1. Contexto

### O Problema Original

Uma IA anterior criou múltiplas Edge Functions separadas:
- `staysnet-webhook-receiver/` - Recebia webhooks
- `staysnet-webhooks-cron/` - Processava webhooks pendentes  
- `staysnet-properties-sync-cron/` - Sincronizava propriedades

Essas functions **importavam código** de `rendizy-server`, mas tinham deploy separado.

### O Incidente (Dezembro 2025 - Janeiro 2026)

1. **05/12/2025**: Última atualização de `rendizy-server` com correções de webhook
2. **05/12/2025**: Functions separadas NÃO foram deployadas (esquecidas)
3. **25/12/2025**: Último webhook recebido com sucesso
4. **18/01/2026**: Usuário reporta que reserva criada na Stays não aparece no dashboard
5. **18/01/2026**: Descoberto que webhooks estavam parados há 20+ dias
6. **18/01/2026**: Causa raiz identificada: functions desincronizadas

### Impacto

- 455 webhooks falharam com "property not resolved"
- 221 reservas ficaram sem `staysnet_reservation_code`
- Dashboard mostrava dados incorretos
- Confiança do usuário abalada

---

## 2. Decisão

### REGRA ABSOLUTA: UMA FUNÇÃO, MÚLTIPLAS ROTAS

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA CORRETA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   supabase/functions/                                       │
│   ├── rendizy-server/      ✅ ÚNICO SERVIDOR DE NEGÓCIO    │
│   │   └── index.ts         → Todas as rotas aqui           │
│   │       ├── /webhooks/staysnet/receive                   │
│   │       ├── /webhooks/staysnet/process                   │
│   │       ├── /cron/staysnet-webhooks                      │
│   │       ├── /cron/staysnet-properties-sync               │
│   │       ├── /properties/...                              │
│   │       ├── /reservations/...                            │
│   │       └── /...todas as outras rotas...                 │
│   │                                                         │
│   └── rendizy-public/      ✅ ÚNICO SERVIDOR PÚBLICO       │
│       └── index.ts         → Rotas públicas (sites)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Functions Permitidas

| Function | Propósito | Autenticação |
|----------|-----------|--------------|
| `rendizy-server` | Toda lógica de negócio (webhooks, reservas, calendário) | Bearer token / API key |
| `rendizy-public` | Sites de clientes públicos | Nenhuma |
| `staysnet-properties-sync-cron` | CRON dedicado sync propriedades 2x/dia | Service Role Key |

### Functions PROIBIDAS (Deprecated)

| Function | Status | Motivo |
|----------|--------|--------|
| `staysnet-webhook-receiver` | 🔴 DEPRECATED | Webhook handler inline em `rendizy-server/index.ts` |
| `staysnet-webhooks-cron` | 🔴 DEPRECATED | Consolidado em `rendizy-server` |
| `execute-rpc-fix` | 🔴 DEPRECATED | Hotfix obsoleto |
| `fix-rpc-function` | 🔴 DEPRECATED | Hotfix obsoleto |
| Qualquer nova function | 🔴 PROIBIDO | Usar rotas em `rendizy-server` |

---

## 3. Regras para IAs

### ❌ PROIBIDO

1. **Criar pastas em `supabase/functions/`** além das duas permitidas
2. **Criar novos `index.ts`** em subpastas de functions
3. **Duplicar lógica** que já existe em `rendizy-server`
4. **Importar de `rendizy-server`** em outras functions
5. **Sugerir "separar para organizar"** - isso já causou problemas

### ✅ OBRIGATÓRIO

1. **Adicionar novas rotas** em `supabase/functions/rendizy-server/index.ts`
2. **Usar o padrão de rotas** existente com Hono
3. **Verificar se a rota já existe** antes de criar
4. **Testar localmente** antes de sugerir deploy
5. **Documentar novas rotas** neste ADR ou em docs relacionados

### 📋 Checklist Antes de Modificar Edge Functions

- [ ] A mudança é em `rendizy-server` ou `rendizy-public`?
- [ ] NÃO estou criando uma nova pasta em `supabase/functions/`?
- [ ] A rota segue o padrão existente?
- [ ] Testei localmente com `supabase functions serve`?
- [ ] Documentei a mudança?

---

## 4. Estrutura de Rotas em rendizy-server

### Webhooks (StaysNet)

```typescript
// Receber webhook da Stays
POST /webhooks/staysnet/receive

// Processar webhooks pendentes
POST /webhooks/staysnet/process

// Processar via cron
POST /cron/staysnet-webhooks
```

### Sincronização

```typescript
// Sync propriedades StaysNet
POST /cron/staysnet-properties-sync

// Import manual de reservas
POST /staysnet/import-reservations
```

### Outras Rotas Existentes

Ver arquivo `supabase/functions/rendizy-server/index.ts` para lista completa.

---

## 5. Deploy

### Comando Único

```bash
# Deployar rendizy-server (99% dos casos)
npm run deploy:server

# Ou diretamente
supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### NPM Scripts Disponíveis

```json
{
  "deploy:server": "supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc",
  "deploy:public": "supabase functions deploy rendizy-public --project-ref odcgnzfremrqnvtitpcc",
  "deploy:all": "node scripts/deploy-all-functions.mjs"
}
```

---

## 6. Consequências

### Positivas

- ✅ Deploy único = sem desincronização
- ✅ Código compartilhado funciona automaticamente
- ✅ Mais fácil de debugar
- ✅ Menos configuração no Supabase

### Negativas (Aceitáveis)

- ⚠️ Arquivo `index.ts` fica grande (mitigado com imports)
- ⚠️ Cold start pode ser maior (aceitável)

---

## 7. Referências

- [ADR_STAYSNET_WEBHOOK_REFERENCE.md](./ADR_STAYSNET_WEBHOOK_REFERENCE.md) - Documentação técnica de webhooks
- [Rules.md](./Rules.md) - Regras gerais do projeto
- [SCRIPTS_DEPLOY_PADRAO.md](./SCRIPTS_DEPLOY_PADRAO.md) - Padrões de deploy

---

## 8. Histórico

| Data | Mudança |
|------|---------|
| 2026-01-18 | Criação do ADR após incidente de 20 dias sem webhooks |
| 2026-01-18 | Consolidação aprovada: uma function, múltiplas rotas |
| 2026-01-18 | Criado routes-cron-staysnet.ts com rotas centralizadas |
| 2026-01-18 | Migração 20260118_consolidate_cron_jobs_centralized.sql |
| 2026-01-20 | **FIX CRÍTICO**: Webhook handler inline em index.ts (bypass ExecutionContext) |
| 2026-01-20 | Auto-processamento de webhooks ao receber (processPendingStaysNetWebhooksForOrg) |
| 2026-01-21 | Deploy de `staysnet-properties-sync-cron` para sync de propriedades |
| 2026-01-21 | CRON configurado: 08:00 e 20:00 BRT via pg_cron |
| 2026-01-21 | **ARQUITETURA FINAL: 3 Edge Functions ativas** |

---

## 9. Rotas Centralizadas Implementadas

### Cron Jobs (StaysNet)

| Rota | Descrição | Substitui |
|------|-----------|-----------|
| `POST /cron/staysnet-properties-sync` | Sync propriedades 2x/dia | `staysnet-properties-sync-cron` |
| `POST /cron/staysnet-webhooks` | Processa webhooks a cada 5min | `staysnet-webhooks-cron` |

### Webhooks (StaysNet)

| Rota | Descrição | Substitui |
|------|-----------|-----------|
| `POST /staysnet/webhook/:orgId` | Recebe webhook da Stays | `staysnet-webhook-receiver` |
| `POST /staysnet/webhooks/process/:orgId` | Processa webhooks manualmente | - |

### Calendar Rules

| Rota | Descrição | Substitui |
|------|-----------|-----------|
| `GET /calendar-rules/batch` | Lista regras com filtros | `calendar-rules-batch` |
| `POST /calendar-rules/batch` | Processa operações em lote | `calendar-rules-batch` |

---

## 10. Estado Final ✅

### Edge Functions ATIVAS (APENAS ESTAS)

| Function | Propósito | CRON |
|----------|-----------|------|
| `rendizy-server` | Backend principal (webhooks, reservas, calendário) | - |
| `rendizy-public` | Sites públicos | - |
| `staysnet-properties-sync-cron` | Sync propriedades Stays.net | 08:00 e 20:00 BRT |

### Edge Functions DELETADAS (NÃO RECRIAR)

| Function | Status | Motivo |
|----------|--------|--------|
| `staysnet-webhook-receiver` | 🔴 DELETADA | Inline handler em index.ts |
| `staysnet-webhooks-cron` | 🔴 DELETADA | Processamento inline em webhook handler |
| `execute-rpc-fix` | 🔴 DELETADA | Hotfix obsoleto |
| `fix-rpc-function` | 🔴 DELETADA | Hotfix obsoleto |
| `calendar-rules-batch` | 🔴 DELETADA | Migrado para rotas em rendizy-server |

---

**LEMBRE-SE**: Se você é uma IA e está pensando em criar uma nova Edge Function,
**PARE** e releia este documento. Use rotas em `rendizy-server` em vez disso.
