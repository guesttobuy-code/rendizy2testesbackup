-- Migration: criar tabela owners (proprietarios)
-- Data: 2026-01-18

/* Requer extensão pgcrypto (para gen_random_uuid()). Execute:
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
*/

CREATE TABLE IF NOT EXISTS public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  document text,
  cpf text,
  rg text,
  profissao text,
  renda_mensal numeric(15,2),
  contract_type text DEFAULT 'non_exclusive' CHECK (contract_type IN ('exclusivity', 'non_exclusive', 'temporary')),
  contract_start_date date,
  contract_end_date date,
  bank_data jsonb DEFAULT '{}'::jsonb,
  taxa_comissao numeric(5,2),
  forma_pagamento_comissao text,
  is_premium boolean DEFAULT false,
  property_ids uuid[] DEFAULT '{}'::uuid[],
  stats jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_owner_email_org UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_owners_organization_id ON public.owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_email ON public.owners(email);
CREATE INDEX IF NOT EXISTS idx_owners_status ON public.owners(status);
CREATE INDEX IF NOT EXISTS idx_owners_contract_type ON public.owners(contract_type);
CREATE INDEX IF NOT EXISTS idx_owners_is_premium ON public.owners(is_premium);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations via service role on owners" ON public.owners;
CREATE POLICY "Allow all operations via service role on owners"
ON public.owners
FOR ALL
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS set_timestamp_owners ON public.owners;
CREATE TRIGGER set_timestamp_owners
BEFORE UPDATE ON public.owners
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();
