-- ================================================================
-- DROP TABLE properties - Tabela depreciada
-- A tabela properties foi substituída por anuncios_ultimate
-- ================================================================

-- Primeiro, remover qualquer FK que ainda aponte para properties
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'properties'
    ) LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped FK constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;
END$$;

-- Agora dropar a tabela properties
DROP TABLE IF EXISTS properties CASCADE;

-- Remover tipos enum relacionados se existirem
DROP TYPE IF EXISTS property_status CASCADE;
DROP TYPE IF EXISTS property_type CASCADE;

-- Verificar que foi removida
SELECT 'properties table dropped' AS status;
