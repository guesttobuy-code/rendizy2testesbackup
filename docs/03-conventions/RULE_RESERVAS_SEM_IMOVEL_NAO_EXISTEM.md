# Regra Canônica: Reservas sem imóvel NÃO existem

## Objetivo
Evitar “reservas fantasma” (linhas em `reservations` sem vínculo com um imóvel válido em `anuncios_ultimate`).

Quando isso acontece:
- telas exibem **“Propriedade não encontrada”**,
- totais (número de reservas, faturamento, taxas) ficam incorretos,
- a conciliação com integrações (Stays.net, Booking, etc.) vira ruído.

**Regra canônica do sistema:**
> Toda reserva deve ter `property_id` apontando para um registro existente em `public.anuncios_ultimate` **da mesma organização**.
> Se não há imóvel, a reserva deve ser **descartada (SKIP)** ou **removida** (se já foi criada por erro legado).

## Aplicação (camadas de blindagem)

### 1) Banco de dados (raiz)
Aplicar migration: `supabase/migrations/20251228_reservations_must_have_property.sql`

Ela faz:
- **limpeza**: deleta reservas órfãs existentes (property_id NULL, property inexistente, ou org mismatch)
- **trava**:
  - `reservations.property_id` vira **NOT NULL**
  - trigger `trg_enforce_reservation_property_link` impede INSERT/UPDATE inválidos

### 2) Importadores/integrações
Importadores nunca podem “inventar” property.

Para Stays.net:
- O import de reservas **não usa fallback** para `property_id`.
- Se não consegue resolver o imóvel via `externalIds` → **SKIP**.

### 3) API/UI
O frontend/modal não pode “puxar” reservas sem imóvel.

Na prática, a raiz já impede existir reserva órfã.
Se aparecer “Propriedade não encontrada”, é sinal de:
- migrations não aplicadas no ambiente, ou
- dados legados antes da regra.

## Operação / Recuperação

### Sintoma
- Card/lista de reservas mostra “Propriedade não encontrada”.

### Ação recomendada
1) Garantir que a FK `reservations.property_id -> anuncios_ultimate(id)` está aplicada com `ON DELETE CASCADE`.
2) Aplicar a migration de blindagem `20251228_reservations_must_have_property.sql`.
3) Reimportar o que for necessário (primeiro imóveis, depois reservas).

## Proibições
- ❌ Criar imóvel/anúncio placeholder para “consertar” reservas.
- ❌ Permitir `property_id` NULL.
- ❌ Permitir reservation/org apontar para imóvel de outra organização.
