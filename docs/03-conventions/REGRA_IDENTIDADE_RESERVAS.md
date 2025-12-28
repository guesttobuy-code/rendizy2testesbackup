# ✅ Regra Canônica — Identidade de Reservas (Multi‑Canal)

## Objetivo
Garantir que:
- importações/reprocessamentos sejam **idempotentes** (zero duplicação),
- atualizações por webhook/import **sempre reorganizem** dados para refletir o estado atual do canal,
- o sistema seja sustentável para múltiplos canais (Airbnb / Booking / Stays / etc).

## Conceitos
### 1) `reservations.id` (ID interno Rendizy)
- **É o ID canônico interno**.
- **Nunca** deve ser um identificador de canal.
- Formato: UUID (armazenado como `TEXT`, mas gerado via `crypto.randomUUID()` no backend).

### 2) Identidade externa (por canal)
- A identidade externa é definida por:

$$(organization\_id,\ platform,\ external\_id)$$

Onde:
- `platform` representa o canal (ex.: `airbnb`, `booking`, `direct`, `other`).
- `external_id` é o identificador **estável** conhecido do canal.

> Importante: o formato do `external_id` é **opaco** (string). Não confiar em tamanho/padrão.

### 3) Regra de UPSERT
- Todas as gravações vindas de integração **devem** fazer upsert por:

$$(organization\_id,\ platform,\ external\_id)$$

- Isso garante que, mesmo que apareçam outros “códigos” (ex.: confirmation code), a reserva será atualizada no mesmo registro interno.

## Stays.net (regra prática)
- Para Stays.net, preferimos:
  - `external_id` = `_id` interno do Stays (mais estável)
  - `staysnet_reservation_code` = código curto/confirmationCode (ex.: `EU20J`)

- Webhooks/import podem chegar com IDs diferentes (ex.: `_id` vs `confirmationCode`).
  - O código deve **resolver por múltiplos candidatos**, mas a gravação final sempre casa pelo `external_id` estável.

## Regras de atualização (“reorganizar” dados)
Quando um webhook/import de uma reserva chega:
- Campos vindos do canal (datas, status, preços, hóspedes, raw) → **sobrescrever** (source of truth)
- Campos internos (ex.: notas internas) → **preservar**

Se existir conflito/legado:
- localizar reserva existente por qualquer candidato (`id`, `external_id`, `staysnet_reservation_code`) para fins de leitura,
- persistir via UPSERT pela identidade externa,
- opcional: rodar rotina de reconciliação (self-healing) para limpar duplicatas antigas.

## Garantias no banco
- Existe um índice único (quando `external_id` não é nulo):
  - `uniq_reservations_org_platform_external_id` em `(organization_id, platform, external_id)`

Isso impede duplicatas e permite UPSERT confiável.

## Referências no código
- Import de reservas Stays:
  - `supabase/functions/rendizy-server/import-staysnet-reservations.ts`
- Processamento de webhooks Stays:
  - `supabase/functions/rendizy-server/routes-staysnet.ts`
- Migração do índice único:
  - `supabase/migrations/20251228_reservations_canonical_identity.sql`
