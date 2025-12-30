-- Stores StaysNet import issues so we never silently drop data.
-- Focus: reservations that cannot be linked to an internal property (anuncios_ultimate).

create table if not exists public.staysnet_import_issues (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null,
  platform text not null default 'staysnet',
  entity_type text not null, -- e.g. 'reservation'
  issue_type text not null,  -- e.g. 'missing_property_mapping'

  -- External identifiers
  external_id text,          -- stays reservation _id (preferred)
  reservation_code text,     -- confirmationCode / id

  -- Mapping context
  listing_id text,           -- stays listing id (_idlisting)
  listing_candidates jsonb,  -- array of candidates we tried

  -- Dates to help operators
  check_in date,
  check_out date,

  partner text,
  platform_source text,

  status text not null default 'open', -- open | resolved
  message text,

  raw_payload jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Idempotency: one open issue per (org, type, external_id) where possible.
create unique index if not exists staysnet_import_issues_unique_external
  on public.staysnet_import_issues (organization_id, platform, entity_type, issue_type, external_id)
  where external_id is not null;

create index if not exists staysnet_import_issues_org_status
  on public.staysnet_import_issues (organization_id, status, created_at desc);

create index if not exists staysnet_import_issues_listing
  on public.staysnet_import_issues (organization_id, listing_id);

-- keep updated_at current
create or replace function public.set_updated_at_staysnet_import_issues()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at_staysnet_import_issues on public.staysnet_import_issues;
create trigger trg_set_updated_at_staysnet_import_issues
before update on public.staysnet_import_issues
for each row execute procedure public.set_updated_at_staysnet_import_issues();
