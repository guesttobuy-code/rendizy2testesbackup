-- Migration: trava de duplicidade para stays_property_id em anuncios_ultimate
-- Cria índice único parcial para impedir duplicação quando o ID da Stays estiver presente

create unique index if not exists anuncios_ultimate_stays_property_uidx
  on anuncios_ultimate ((data->'externalIds'->>'stays_property_id'))
  where data->'externalIds'->>'stays_property_id' is not null;
