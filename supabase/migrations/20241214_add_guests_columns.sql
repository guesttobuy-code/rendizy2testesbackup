-- ============================================================================
-- MIGRATION: Add columns to guests table for complete guest management
-- ============================================================================
-- Date: 2024-12-14
-- Version: v1.0.103.340
-- Purpose: Align guests table structure with guestToSql() mapper
-- ============================================================================

-- Add missing columns to guests table
ALTER TABLE public.guests 
  -- Organization (multi-tenant)
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Personal data (replace 'name' with 'first_name' + 'last_name')
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  
  -- Documents
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS passport text,
  ADD COLUMN IF NOT EXISTS rg text,
  
  -- Address (flat structure)
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip_code text,
  ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'BR',
  
  -- Demographics
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt-BR',
  
  -- Stats (flat structure)
  ADD COLUMN IF NOT EXISTS stats_total_reservations integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_total_nights integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_total_spent numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_average_rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS stats_last_stay_date timestamptz,
  
  -- Preferences (flat booleans)
  ADD COLUMN IF NOT EXISTS preferences_early_check_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences_late_check_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences_quiet_floor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences_high_floor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferences_pets boolean DEFAULT false,
  
  -- Tags (array)
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  
  -- Blacklist
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklist_reason text,
  ADD COLUMN IF NOT EXISTS blacklisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS blacklisted_by uuid,
  
  -- Notes
  ADD COLUMN IF NOT EXISTS notes text,
  
  -- Source (platform)
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';

-- Add check constraint for source field
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'guests_source_check'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_source_check 
      CHECK (source IN ('airbnb', 'booking', 'decolar', 'direct', 'other'));
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_guests_organization_id ON public.guests(organization_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON public.guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_source ON public.guests(source);
CREATE INDEX IF NOT EXISTS idx_guests_is_blacklisted ON public.guests(is_blacklisted);

-- Update RLS policy to use organization_id
DROP POLICY IF EXISTS allow_all_guests_finance ON public.guests;

-- Policy for superadmin (users.type = 'superadmin')
CREATE POLICY allow_superadmin_all_guests ON public.guests
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.type = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.type = 'superadmin'
    )
  );

-- Policy for organization users
CREATE POLICY allow_org_users_guests ON public.guests
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.guests IS 'Complete guest management with multi-tenant support';
COMMENT ON COLUMN public.guests.organization_id IS 'Organization/imobiliaria ID (multi-tenant)';
COMMENT ON COLUMN public.guests.first_name IS 'Guest first name';
COMMENT ON COLUMN public.guests.last_name IS 'Guest last name';
COMMENT ON COLUMN public.guests.source IS 'Guest acquisition source (airbnb, booking, decolar, direct, other)';
COMMENT ON COLUMN public.guests.is_blacklisted IS 'Flag indicating if guest is blacklisted';

-- Migration complete
DO $$ BEGIN
  RAISE NOTICE '✅ Migration 20241214_add_guests_columns.sql completed successfully';
  RAISE NOTICE '   - Added 30+ columns to guests table';
  RAISE NOTICE '   - Added organization_id for multi-tenant support';
  RAISE NOTICE '   - Added check constraint for source field';
  RAISE NOTICE '   - Created indexes for performance';
  RAISE NOTICE '   - Updated RLS policies for multi-tenant';
END $$;
