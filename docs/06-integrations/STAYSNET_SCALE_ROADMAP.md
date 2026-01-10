# STAYS.NET — ROADMAP CANÔNICO (ESCALA + EFICIÊNCIA)

> **Objetivo:** tornar a integração Stays.net previsível em custo (DB/egress/invocations), estável em dados, e escalável para múltiplas organizações.
>
> **Escopo deste documento:** importação (modal + endpoints), robô/worker de atualização, webhooks, armazenamento raw e padrões de dados.
>
> **Fonte de verdade:** este arquivo + [docs/Rules.md](../Rules.md)

---

## 1) Diagnóstico (por que não escala hoje)

### 1.1 Custos dominantes

1. **Egress**: volume de dados trafegado para fora do Supabase (principalmente Supabase → Stays.net e Supabase → navegador/UI).
2. **Invocations**: muitas chamadas pequenas repetidas (UI paginando/retentando; imports “travados” em 1 página; fan-out por item).
3. **DB roundtrips**: loops item-a-item com `select/update/insert` por reserva/guest/block.

### 1.2 Anti-patterns observados (devem virar regra)

- **Fan-out por item**: buscar detalhes por reserva (`/booking/reservations/{id}`) ou por cliente (`/booking/clients/{id}`) para N itens sem orçamento.
- **Paginação “forçada”**: limitar páginas por request sem cursor persistido/controle de continuidade.
- **Dedupe item-a-item**: checar existência no DB para cada item (múltiplos selects).
- **Logs verbosos**: logar headers/payloads grandes (custos e risco de vazamento de segredo).
- **Dois pipelines concorrentes**: “full sync” antigo coexistindo com modular imports.

---

## 2) Princípios Canônicos (a IA deve seguir)

### 2.1 Single Source of Truth (SSOT)

- **Import modular é o padrão** (properties/reservations/guests/blocks/finance).
- “Full sync” só pode existir como wrapper que chama o modular, nunca lógica paralela.

### 2.2 Orçamento de execução por request

Toda execução de Edge Function que puxa Stays.net precisa respeitar:

- **`maxRuntimeMs`** (ex.: 20–35s) com early-exit
- **`fetchTimeoutMs`** (ex.: 10–15s)
- **cursor** de continuidade (`next.skip` / `next.page` / `next.from`) retornado sempre

### 2.3 Controle de egress (hard rules)

- Nunca retornar payloads grandes para o frontend.
- Nunca logar payloads completos por padrão.
- “Enriquecimento” (details/clients) só ocorre quando:
  - faltam campos críticos, e
  - há orçamento disponível, e
  - há cache/short-circuit no DB (evitar re-fetch do mesmo client/reservation).

### 2.4 Eficiência de banco (hard rules)

- Proibido fazer `SELECT`/`UPDATE` por item quando existe alternativa em lote.
- Preferir:
  - `upsert` em batch
  - pré-busca de IDs existentes (`IN (...)`) por janela/página
  - updates em lote quando possível

---

## 3) Roadmap Prioritário (P0 → P2)

> As prioridades abaixo são **ordem de execução**. Não pular.

### P0 — Estabilidade e custo (primeiro)

**P0.1 — “Budget” e cursor padronizados em todos imports**
- Implementar/normalizar `maxRuntimeMs`, `fetchTimeoutMs`, `next` em:
  - reservations
  - guests
  - blocks
  - properties
- Definição de pronto:
  - toda rota retorna `{ success, stats, next }`
  - toda rota suporta continuar via `next.skip`

**P0.2 — Reduzir fan-out (details/clients)**
- `expandDetails` (reservations): default **off** ou “smart on” (só quando faltar dado).
- `/booking/clients/{id}` (guests): chamar apenas quando realmente necessário.
- Definição de pronto:
  - queda clara no número de requests externos por execução

**P0.3 — Reduzir roundtrips do DB**
- blocks: dedupe/insert em lote.
- guests: checagens por email/cpf/passport com estratégia que minimize queries.
- Definição de pronto:
  - por página, número de queries reduzido de O(n) para O(1)–O(log n)

**P0.4 — Logging seguro e minimalista**
- Nunca logar:
  - credenciais
  - headers completos
  - payloads completos
- Adotar padrão: `endpoint`, `status`, `durationMs`, `itemsCount`, `orgId`.

### P1 — Arquitetura perene (depois)

**P1.1 — Jobs assíncronos (UI dispara, worker executa)**
- Criar tabela `staysnet_jobs` (multi-tenant):
  - type (properties/reservations/blocks/guests)
  - status (queued/running/done/error)
  - cursor
  - stats
  - locked_by, locked_at
- Worker executa em loop curto com orçamento e requeue.
- UI só “acompanha” status.

**P1.2 — Watermarks (delta sync)**
- Persistir `last_successful_sync_at` por org e por domínio.
- Default import: janelas menores (ex.: 90 dias passado + 180 futuro), ampliável.

**P1.3 — Idempotência e versionamento raw**
- Raw store mantém `payload_hash` (já existe): usar isso para evitar duplicação.
- Política: raw completo só quando mudou.

### P2 — Hardening e observabilidade

**P2.1 — Métricas internas (sem payload)**
- Persistir por execução: requests externos, bytes aproximados, rows upserted.

**P2.2 — Reprocessamento controlado**
- “Reprocessar” deve ser job com alvo (propertyIds/period) e não full-pull indiscriminado.

---

## 4) Alinhamento definitivo (modal x robô x webhooks)

### 4.1 Contrato único

- Modal = inicia jobs e mostra status.
- Worker = executa imports.
- Webhook = enfileira jobs incrementais (ex.: “mudou reserva X”).

### 4.2 Regras de consistência

- `properties` é canônica.
- `reservations.external_id` deve ser estável por provedor.
- `guests` dedupe por:
  - `staysnet_client_id` (quando existe)
  - fallback: email/cpf/passport

### 4.3 Regra de fallback

- Se webhook falhar: reconciliador (cron) cobre a janela recente.

---

## 5) Checklist de implementação (para IA)

- [ ] Todas as rotas Stays import suportam cursor e orçamento.
- [ ] Nenhum log imprime segredo/payload completo.
- [ ] Nenhuma rotina faz DB roundtrip por item se houver batch.
- [ ] UI não puxa dados pesados nem reprocessa “no escuro”.
- [ ] Webhook nunca executa full import inline; apenas enfileira job.

---

*Última atualização: 2026-01-07*
