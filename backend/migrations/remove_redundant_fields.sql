-- Migration: Remove redundant fields from travel_packages table
-- These fields are now computed in real-time using service layer
-- Date: $(date)
-- Description: Remove Rating, ReviewCount, and MobileNumber columns as they are now computed fields

-- Backup current data before migration (recommended)
-- CREATE TABLE travel_packages_backup AS SELECT * FROM travel_packages;

BEGIN;

-- Remove redundant columns that are now computed fields
-- rating -> calculated from reviews table average
-- review_count -> calculated from reviews table count  
-- mobile_number -> not used in current application

-- Note: Uncomment these lines when ready to execute migration
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS rating;
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS review_count;
-- ALTER TABLE travel_packages DROP COLUMN IF EXISTS mobile_number;

-- Verify remaining columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
ORDER BY ordinal_position;

COMMIT;

-- Instructions:
-- 1. First create backup: CREATE TABLE travel_packages_backup AS SELECT * FROM travel_packages;
-- 2. Test in development environment first
-- 3. Uncomment ALTER TABLE statements above
-- 4. Run this migration
-- 5. Verify API endpoints still work correctly
-- 6. Monitor performance of computed field queries