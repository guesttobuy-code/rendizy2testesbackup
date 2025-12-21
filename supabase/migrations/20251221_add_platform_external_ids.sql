-- Migration: Padroniza externalIds em anuncios_ultimate e backfill stays_property_id
-- Objetivo: estruturar IDs externos por plataforma e evitar duplicidade no Stays

-- Observação: se data não for objeto (por ex. string/array), convertemos para '{}'
update anuncios_ultimate
set data = jsonb_set(
  case when jsonb_typeof(data) = 'object' then data else '{}'::jsonb end,
  '{externalIds}',
  coalesce(
    case when jsonb_typeof(data) = 'object' then data->'externalIds' end,
    case when jsonb_typeof(data) = 'object' then data->'external_ids' end,
    '{}'::jsonb
  ),
  true
)
where data is not null;

-- 2) Backfill stays_property_id usando os campos legados/variantes
with src as (
  select
    id,
    case when jsonb_typeof(data) = 'object' then data else '{}'::jsonb end as d
  from anuncios_ultimate
), enriched as (
  select
    id,
    coalesce(
      d->'externalIds'->>'stays_property_id',
      d->'externalIds'->>'stays_net_id',
      d->'external_ids'->>'stays_net_id',
      d->'_stays_net_original'->>'id',
      d->'_stays_net_original'->>'_id',
      d->'_stays_net_original'->>'listingId'
    ) as stays_id,
    d
  from src
)
update anuncios_ultimate a
set data = jsonb_set(a.data, '{externalIds,stays_property_id}', to_jsonb(en.stays_id), true)
from enriched en
where a.id = en.id and en.stays_id is not null;

-- 3) Criar índice parcial para deduplicação por Stays
create index if not exists anuncios_ultimate_stays_property_idx
  on anuncios_ultimate ((data->'externalIds'->>'stays_property_id'))
  where data->'externalIds'->>'stays_property_id' is not null;
