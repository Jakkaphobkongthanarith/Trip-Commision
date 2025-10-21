-- Migration Script: Remove Redundant Fields from Travel Packages
-- Date: October 21, 2025
-- Description: Safely remove redundant columns that are now computed fields
-- Version: 1.0

-- ================================================================
-- PHASE 1: BACKUP AND SAFETY CHECKS
-- ================================================================

-- Create backup table with current timestamp
DO $$
DECLARE
    backup_table_name TEXT;
BEGIN
    backup_table_name := 'travel_packages_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM travel_packages', backup_table_name);
    RAISE NOTICE 'Backup created: %', backup_table_name;
END $$;

-- Verify current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
AND column_name IN ('rating', 'review_count', 'mobile_number')
ORDER BY ordinal_position;

-- Count existing data in fields to be removed
SELECT 
    COUNT(*) as total_packages,
    COUNT(rating) as packages_with_rating,
    COUNT(review_count) as packages_with_review_count,
    COUNT(mobile_number) as packages_with_mobile_number,
    AVG(rating) as avg_rating,
    MAX(review_count) as max_review_count
FROM travel_packages
WHERE rating IS NOT NULL OR review_count IS NOT NULL OR mobile_number IS NOT NULL;

-- ================================================================
-- PHASE 2: VALIDATION CHECKS
-- ================================================================

-- Check if computed fields service is working properly
-- This should be run BEFORE migration to ensure the new system works
DO $$
DECLARE
    test_package_id UUID;
    computed_rating DECIMAL;
    computed_review_count INTEGER;
BEGIN
    -- Get a sample package ID
    SELECT id INTO test_package_id FROM travel_packages LIMIT 1;
    
    -- Test computed rating calculation
    SELECT 
        COALESCE(AVG(rating), 0),
        COUNT(*)
    INTO computed_rating, computed_review_count
    FROM reviews 
    WHERE package_id = test_package_id;
    
    RAISE NOTICE 'Test package % - Computed rating: %, Review count: %', 
        test_package_id, computed_rating, computed_review_count;
        
    IF test_package_id IS NULL THEN
        RAISE EXCEPTION 'No packages found for testing';
    END IF;
END $$;

-- ================================================================
-- PHASE 3: MIGRATION EXECUTION (UNCOMMENT WHEN READY)
-- ================================================================

BEGIN;

-- Step 1: Remove rating column
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS rating;
RAISE NOTICE 'Step 1: rating column would be removed (currently commented)';

-- Step 2: Remove review_count column  
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS review_count;
RAISE NOTICE 'Step 2: review_count column would be removed (currently commented)';

-- Step 3: Remove mobile_number column
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS mobile_number;
RAISE NOTICE 'Step 3: mobile_number column would be removed (currently commented)';

-- Verify final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
ORDER BY ordinal_position;

COMMIT;

-- ================================================================
-- POST-MIGRATION VERIFICATION
-- ================================================================

-- Check that essential columns remain
DO $$
DECLARE
    essential_columns TEXT[] := ARRAY['id', 'title', 'description', 'location', 'price', 'duration', 'is_active'];
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY essential_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'travel_packages' AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing essential columns: %', missing_columns;
    ELSE
        RAISE NOTICE 'All essential columns present';
    END IF;
END $$;

-- Final success message
RAISE NOTICE 'Migration script completed successfully!';
RAISE NOTICE 'Remember to:';
RAISE NOTICE '1. Test the application thoroughly';
RAISE NOTICE '2. Run the index creation script';
RAISE NOTICE '3. Monitor performance logs';
RAISE NOTICE '4. Remove backup table after verification';