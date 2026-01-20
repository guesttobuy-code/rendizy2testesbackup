-- ============================================================================
-- MIGRATION: RPC para salvar currency_settings em organizations.metadata
-- Data: 2026-01-01
-- Objetivo: Persistência atômica de settings de moeda por organização
-- ============================================================================

create or replace function public.set_organization_currency_settings(
  org_id uuid,
  settings jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  new_metadata jsonb;
begin
  update public.organizations
  set
    metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{currency_settings}',
      coalesce(settings, '{}'::jsonb),
      true
    ),
    updated_at = now()
  where id = org_id
  returning metadata into new_metadata;

  if new_metadata is null then
    raise exception 'Organization not found';
  end if;

  return new_metadata -> 'currency_settings';
end;
$$;

-- Log
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 2026010101_add_organization_currency_settings_rpc concluída';
END $$;
