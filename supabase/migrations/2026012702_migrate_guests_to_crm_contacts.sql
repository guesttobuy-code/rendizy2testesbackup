-- ============================================================================
-- MIGRATION: Migrar dados de guests para crm_contacts
-- Data: 2026-01-27
-- Descrição: Copia todos os hóspedes existentes para crm_contacts unificado
-- ============================================================================

-- ============================================================================
-- 1. MIGRAR DADOS DE GUESTS PARA CRM_CONTACTS
-- ============================================================================

-- Inserir guests em crm_contacts (evitando duplicatas por staysnet_client_id ou email)
INSERT INTO crm_contacts (
  id,
  organization_id,
  -- Tipo de contato
  contact_type,
  is_type_locked,
  -- Dados pessoais
  first_name,
  last_name,
  email,
  phone,
  mobile,
  -- Documentos
  cpf,
  passport,
  rg,
  -- Endereço
  address_street,
  address_number,
  address_complement,
  address_neighborhood,
  address_city,
  address_state,
  address_country,
  address_zip,
  -- Dados adicionais
  birth_date,
  nationality,
  language,
  -- Estatísticas de hóspede
  stats_total_reservations,
  stats_total_nights,
  stats_total_spent,
  stats_average_rating,
  stats_last_stay_date,
  -- Preferências (convertendo booleans para JSONB)
  preferences,
  -- Blacklist
  is_blacklisted,
  blacklist_reason,
  blacklisted_at,
  blacklisted_by,
  -- Tags e notas
  tags,
  notes,
  -- Source
  source,
  -- StaysNet
  staysnet_client_id,
  staysnet_raw,
  -- Timestamps
  created_at,
  updated_at
)
SELECT 
  g.id,
  g.organization_id,
  -- Tipo de contato fixo
  'guest'::VARCHAR(20) as contact_type,
  true as is_type_locked,
  -- Dados pessoais
  g.first_name,
  g.last_name,
  g.email,
  g.phone,
  g.phone as mobile,
  -- Documentos
  g.cpf,
  g.passport,
  g.rg,
  -- Endereço
  g.address_street,
  g.address_number,
  g.address_complement,
  g.address_neighborhood,
  g.address_city,
  g.address_state,
  COALESCE(g.address_country, 'BR') as address_country,
  g.address_zip_code as address_zip,
  -- Dados adicionais
  g.birth_date,
  g.nationality,
  COALESCE(g.language, 'pt-BR') as language,
  -- Estatísticas
  COALESCE(g.stats_total_reservations, 0) as stats_total_reservations,
  COALESCE(g.stats_total_nights, 0) as stats_total_nights,
  COALESCE(g.stats_total_spent, 0) as stats_total_spent,
  g.stats_average_rating,
  g.stats_last_stay_date,
  -- Preferências (convertendo booleans para JSONB)
  jsonb_build_object(
    'early_check_in', COALESCE(g.preferences_early_check_in, false),
    'late_check_out', COALESCE(g.preferences_late_check_out, false),
    'quiet_floor', COALESCE(g.preferences_quiet_floor, false),
    'high_floor', COALESCE(g.preferences_high_floor, false),
    'pets', COALESCE(g.preferences_pets, false)
  ) as preferences,
  -- Blacklist
  COALESCE(g.is_blacklisted, false) as is_blacklisted,
  g.blacklist_reason,
  g.blacklisted_at,
  g.blacklisted_by,
  -- Tags (incluindo 'migrado-de-guests')
  ARRAY_APPEND(COALESCE(g.tags, '{}'), 'migrado-de-guests') as tags,
  g.notes,
  -- Source
  COALESCE(g.source, 'other') as source,
  -- StaysNet
  g.staysnet_client_id,
  g.staysnet_raw,
  -- Timestamps
  g.created_at,
  g.updated_at
FROM guests g
WHERE g.organization_id IS NOT NULL
  -- Evitar duplicatas: não inserir se já existe um contato com mesmo staysnet_client_id ou email na org
  AND NOT EXISTS (
    SELECT 1 FROM crm_contacts c
    WHERE c.organization_id = g.organization_id
    AND (
      (g.staysnet_client_id IS NOT NULL AND c.staysnet_client_id = g.staysnet_client_id)
      OR (g.email IS NOT NULL AND c.email = g.email AND c.contact_type = 'guest')
    )
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. ATUALIZAR RESERVATIONS PARA USAR CRM_CONTACT_ID
-- ============================================================================

-- Vincular reservations com crm_contacts baseado no guest_id
UPDATE reservations r
SET crm_contact_id = g.id
FROM guests g
WHERE r.guest_id = g.id
  AND r.crm_contact_id IS NULL
  AND EXISTS (
    SELECT 1 FROM crm_contacts c WHERE c.id = g.id
  );

-- ============================================================================
-- 3. ESTATÍSTICAS DA MIGRAÇÃO
-- ============================================================================

DO $$ 
DECLARE
  total_guests INTEGER;
  migrated_contacts INTEGER;
  linked_reservations INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_guests FROM guests WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO migrated_contacts FROM crm_contacts WHERE contact_type = 'guest';
  SELECT COUNT(*) INTO linked_reservations FROM reservations WHERE crm_contact_id IS NOT NULL;
  
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRAÇÃO DE GUESTS PARA CRM_CONTACTS CONCLUÍDA';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '   📊 Total de guests na tabela original: %', total_guests;
  RAISE NOTICE '   📊 Total de contatos tipo guest em crm_contacts: %', migrated_contacts;
  RAISE NOTICE '   📊 Reservations vinculadas via crm_contact_id: %', linked_reservations;
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- PRONTO! Migração concluída.
-- ============================================================================
