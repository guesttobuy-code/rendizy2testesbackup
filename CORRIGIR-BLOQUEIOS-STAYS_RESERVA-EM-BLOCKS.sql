-- Corrige bug: bloqueios/maintenance da Stays gravados como reservas no Rendizy
--
-- O que faz:
-- 1) Encontra reservas com staysnet_type/staysnet_raw.type = blocked/maintenance
-- 2) Cria registros equivalentes na tabela `blocks` (se ainda não existirem)
-- 3) Remove essas reservas misclassificadas de `reservations`
--
-- ⚠️ Rode com cuidado em PRODUÇÃO. Recomendo filtrar por período e/ou property_id.
--
-- Ajuste aqui:
--   - org_id
--   - de/até
--   - (opcional) property_id

begin;

-- =========================
-- PARAMETROS
-- =========================
-- Coloque o organization_id correto:
-- Ex: '00000000-0000-0000-0000-000000000000'

-- Troque também o range se quiser limitar.

with params as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as org_id,
    '2025-12-01'::date as from_date,
    '2026-02-01'::date as to_date,
    null::uuid as only_property_id -- opcional: filtre por um imóvel específico
),
wrong as (
  select
    r.id as reservation_id,
    r.organization_id,
    r.property_id,
    r.check_in::date as start_date,
    r.check_out::date as end_date,
    greatest(1, (r.check_out::date - r.check_in::date))::int as nights,
    lower(coalesce(r.staysnet_raw->>'type', r.staysnet_type, '')) as stays_type
  from reservations r
  join params p on p.org_id = r.organization_id
  where r.property_id is not null
    and r.check_in::date < p.to_date
    and r.check_out::date > p.from_date
    and (
      p.only_property_id is null
      or r.property_id = p.only_property_id
    )
    and lower(coalesce(r.staysnet_raw->>'type', r.staysnet_type, '')) in (
      'blocked','bloqueado','maintenance','manutenção','manutencao'
    )
),
blocks_to_insert as (
  select
    gen_random_uuid() as id,
    w.organization_id,
    w.property_id,
    w.start_date,
    w.end_date,
    w.nights,
    'block'::text as type,
    case
      when w.stays_type in ('maintenance','manutenção','manutencao') then 'maintenance'
      else 'simple'
    end as subtype,
    case
      when w.stays_type in ('maintenance','manutenção','manutencao') then 'Manutenção (Stays.net)'
      else 'Bloqueio (Stays.net)'
    end as reason,
    jsonb_build_object(
      'repair', true,
      'source', 'misclassified_reservation',
      'reservation_id', w.reservation_id,
      'stays_type', w.stays_type
    )::text as notes,
    now() as created_at,
    now() as updated_at,
    'repair-script'::text as created_by
  from wrong w
  where not exists (
    select 1
    from blocks b
    where b.organization_id = w.organization_id
      and b.property_id = w.property_id
      and b.start_date = w.start_date
      and b.end_date = w.end_date
      and b.subtype = case
        when w.stays_type in ('maintenance','manutenção','manutencao') then 'maintenance'
        else 'simple'
      end
  )
)
insert into blocks (
  id, organization_id, property_id,
  start_date, end_date, nights,
  type, subtype, reason, notes,
  created_at, updated_at, created_by
)
select
  id, organization_id, property_id,
  start_date, end_date, nights,
  type, subtype, reason, notes,
  created_at, updated_at, created_by
from blocks_to_insert;

-- Apagar reservas misclassificadas
delete from reservations r
using wrong w
where r.id = w.reservation_id;

commit;

-- Para conferir depois:
-- select count(*) from blocks where notes like '%misclassified_reservation%';
-- select count(*) from reservations where lower(coalesce(staysnet_raw->>'type', staysnet_type, '')) in ('blocked','maintenance');
