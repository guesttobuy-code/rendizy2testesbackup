-- ============================================================
-- Global/Listing Settings for Reservations (Minimum Nights)
-- ============================================================

-- Global settings per organization
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_settings_org_unique
  ON organization_settings(organization_id);

-- Listing-level settings (override)
CREATE TABLE IF NOT EXISTS listing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Nota: listing_id aponta para properties(id) no fluxo de anúncios
  listing_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS listing_settings_org_listing_unique
  ON listing_settings(organization_id, listing_id);

-- updated_at trigger (reutiliza função existente)
DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON organization_settings;
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listing_settings_updated_at ON listing_settings;
CREATE TRIGGER update_listing_settings_updated_at
  BEFORE UPDATE ON listing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_settings_select_policy ON organization_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY organization_settings_insert_policy ON organization_settings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY organization_settings_update_policy ON organization_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY organization_settings_delete_policy ON organization_settings
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY listing_settings_select_policy ON listing_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY listing_settings_insert_policy ON listing_settings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY listing_settings_update_policy ON listing_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY listing_settings_delete_policy ON listing_settings
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
