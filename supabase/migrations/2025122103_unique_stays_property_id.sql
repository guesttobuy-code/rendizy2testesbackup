-- Migration: trava de duplicidade para stays_property_id em properties
-- Cria índice único parcial para impedir duplicação quando o ID da Stays estiver presente

create unique index if not exists properties_stays_property_uidx
  on properties ((data->'externalIds'->>'stays_property_id'))
  where data->'externalIds'->>'stays_property_id' is not null;
