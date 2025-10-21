-- Supabase Backup Creation
-- Run this SECOND in Supabase SQL Editor
-- Date: October 21, 2025

-- Create backup table with timestamp
CREATE TABLE travel_packages_backup_2025_10_21 AS 
SELECT * FROM travel_packages;

-- Verify backup was created
SELECT 
    COUNT(*) as original_count
FROM travel_packages

UNION ALL

SELECT 
    COUNT(*) as backup_count
FROM travel_packages_backup_2025_10_21;

-- Check that backup was created successfully
SELECT 
    'Backup verification:' as status,
    COUNT(*) as backup_record_count,
    'Records backed up successfully' as message
FROM travel_packages_backup_2025_10_21;