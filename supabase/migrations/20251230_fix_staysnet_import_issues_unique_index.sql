-- Fix staysnet_import_issues upsert compatibility.
-- Supabase/PostgREST upsert requires a non-partial unique constraint/index on the on_conflict columns.
-- A plain unique index still allows multiple NULL external_id values, while enforcing uniqueness when external_id is present.

begin;

drop index if exists public.staysnet_import_issues_unique_external;

create unique index if not exists staysnet_import_issues_unique_external
  on public.staysnet_import_issues (organization_id, platform, entity_type, issue_type, external_id);

commit;
