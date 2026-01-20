-- Migration: criar tabela properties e anuncios_field_changes
-- Data: 2025-12-12

/* Requer extensão pgcrypto (para gen_random_uuid()). Execute:
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
*/

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(32) DEFAULT 'created',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anuncios_field_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  field text NOT NULL,
  value jsonb,
  idempotency_key text,
  created_at timestamptz DEFAULT now()
);

-- Prevent re-processing the same idempotency key across changes
CREATE UNIQUE INDEX IF NOT EXISTS idx_anuncios_changes_idempotency ON public.anuncios_field_changes (idempotency_key);

-- trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.properties;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();
