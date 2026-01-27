-- ============================================================================
-- PRÉ-VERIFICAÇÃO: Antes de migrar guests para crm_contacts
-- Data: 2026-01-27
-- Execute este script ANTES da migração principal
-- ============================================================================

-- 1. Quantos guests existem?
SELECT 
  'Total guests' as metric,
  COUNT(*) as count
FROM guests
WHERE organization_id IS NOT NULL;

-- 2. Quantos crm_contacts já existem?
SELECT 
  'Total crm_contacts' as metric,
  COUNT(*) as count
FROM crm_contacts;

-- 3. Crm_contacts por tipo
SELECT 
  contact_type,
  COUNT(*) as count
FROM crm_contacts
GROUP BY contact_type;

-- 4. Possíveis duplicatas: guests que já existem em crm_contacts (por email)
SELECT 
  'Duplicatas por email' as metric,
  COUNT(*) as count
FROM guests g
WHERE g.organization_id IS NOT NULL
  AND g.email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM crm_contacts c
    WHERE c.organization_id = g.organization_id
    AND c.email = g.email
  );

-- 5. Possíveis duplicatas: guests que já existem em crm_contacts (por staysnet_client_id)
SELECT 
  'Duplicatas por staysnet_client_id' as metric,
  COUNT(*) as count
FROM guests g
WHERE g.organization_id IS NOT NULL
  AND g.staysnet_client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM crm_contacts c
    WHERE c.organization_id = g.organization_id
    AND c.staysnet_client_id = g.staysnet_client_id
  );

-- 6. Guests que serão migrados (novos, sem duplicata)
SELECT 
  'Guests a migrar (novos)' as metric,
  COUNT(*) as count
FROM guests g
WHERE g.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM crm_contacts c
    WHERE c.organization_id = g.organization_id
    AND (
      (g.staysnet_client_id IS NOT NULL AND c.staysnet_client_id = g.staysnet_client_id)
      OR (g.email IS NOT NULL AND c.email = g.email AND c.contact_type = 'guest')
    )
  );

-- 7. Reservations que precisam de vínculo crm_contact_id
SELECT 
  'Reservations sem crm_contact_id' as metric,
  COUNT(*) as count
FROM reservations
WHERE crm_contact_id IS NULL
  AND guest_id IS NOT NULL;

-- 8. Listar amostra de guests para verificação manual (top 10)
SELECT 
  g.id,
  g.first_name,
  g.last_name,
  g.email,
  g.staysnet_client_id,
  g.organization_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM crm_contacts c 
      WHERE c.organization_id = g.organization_id 
      AND c.email = g.email
    ) THEN 'JÁ EXISTE (email)'
    WHEN EXISTS (
      SELECT 1 FROM crm_contacts c 
      WHERE c.organization_id = g.organization_id 
      AND c.staysnet_client_id = g.staysnet_client_id
    ) THEN 'JÁ EXISTE (staysnet_id)'
    ELSE 'SERÁ MIGRADO'
  END as status
FROM guests g
WHERE g.organization_id IS NOT NULL
LIMIT 10;
