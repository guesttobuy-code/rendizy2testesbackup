-- RPC: set_organization_discount_packages
--
-- Stores Settings → Precificação → "Descontos por pacote de dias" in organizations.metadata.discount_packages

CREATE OR REPLACE FUNCTION public.set_organization_discount_packages(
  p_organization_id uuid,
  p_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated jsonb;
BEGIN
  UPDATE public.organizations
    SET metadata = jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{discount_packages}',
      coalesce(p_settings, '{}'::jsonb),
      true
    )
  WHERE id = p_organization_id
  RETURNING coalesce(metadata, '{}'::jsonb) -> 'discount_packages' INTO v_updated;

  IF v_updated IS NULL THEN
    -- Organization not found or metadata missing
    RETURN '{}'::jsonb;
  END IF;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organization_discount_packages(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_organization_discount_packages(uuid, jsonb) TO authenticated;
