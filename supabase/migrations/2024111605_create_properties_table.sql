-- Cria tabela base de propriedades antes das dependências (ex.: listings)
-- Usamos id TEXT para aceitar rascunhos com prefixo "draft-*"
create table if not exists public.properties (
    id text primary key,
    organization_id uuid,
    owner_id uuid,
    location_id uuid,

    name text,
    code text,
    type text,
    status text default 'draft',

    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zip_code text,
    address_country text default 'BR',

    max_guests integer,
    bedrooms integer,
    beds integer,
    bathrooms numeric,
    area numeric,

    pricing_base_price numeric,
    pricing_currency text default 'BRL',
    pricing_weekly_discount numeric,
    pricing_biweekly_discount numeric,
    pricing_monthly_discount numeric,

    restrictions_min_nights integer,
    restrictions_max_nights integer,
    restrictions_advance_booking integer,
    restrictions_preparation_time integer,

    amenities jsonb default '[]'::jsonb,
    tags jsonb default '[]'::jsonb,
    photos jsonb default '[]'::jsonb,
    folder text,
    color text,
    cover_photo text,
    description text,
    short_description text,

    platforms_airbnb_enabled boolean default false,
    platforms_airbnb_listing_id text,
    platforms_airbnb_sync_enabled boolean default false,
    platforms_booking_enabled boolean default false,
    platforms_booking_listing_id text,
    platforms_booking_sync_enabled boolean default false,
    platforms_decolar_enabled boolean default false,
    platforms_decolar_listing_id text,
    platforms_decolar_sync_enabled boolean default false,
    platforms_direct boolean default true,

    is_active boolean default true,
    wizard_data jsonb default '{}'::jsonb,
    completion_percentage integer default 0,
    completed_steps jsonb default '[]'::jsonb,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_owner_idx on public.properties(owner_id);
create index if not exists properties_org_idx on public.properties(organization_id);
create index if not exists properties_location_idx on public.properties(location_id);

comment on table public.properties is 'Cadastro de imóveis/propriedades. Suporta rascunhos (id texto, status=draft) e registros finais.';
