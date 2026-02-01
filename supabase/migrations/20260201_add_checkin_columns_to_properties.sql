-- ============================================================================
-- MIGRATION: Add Check-in Configuration Columns to Properties
-- Date: 2026-02-01
-- Description: Adds checkin_category and checkin_config columns to properties
--              table for the Check-in operational configuration module
-- ============================================================================

-- Add checkin_category column (enum-like string for category type)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS checkin_category TEXT;

-- Add checkin_config column (JSONB for detailed configuration)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS checkin_config JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN properties.checkin_category IS 
'Check-in category type: normal, grupo_whatsapp, portaria_direta, email_portaria, pessoa_especifica, aplicativo, formulario';

COMMENT ON COLUMN properties.checkin_config IS 
'JSON config with: access_method, access_instructions, access_photos, required_documents, checkin_time, checkout_time, early_checkin, late_checkout, reminder_hours, verification_hours, confirmation_hours, responsible_name, responsible_phone, responsible_email, app_type, app_credentials, form_url, etc.';

-- Create index for faster queries by category
CREATE INDEX IF NOT EXISTS idx_properties_checkin_category 
ON properties(checkin_category) 
WHERE checkin_category IS NOT NULL;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20260201_add_checkin_columns_to_properties completed';
  RAISE NOTICE '   - Added checkin_category column (TEXT)';
  RAISE NOTICE '   - Added checkin_config column (JSONB)';
  RAISE NOTICE '   - Created index idx_properties_checkin_category';
END $$;
