-- Supabase Field Removal Migration
-- Run this THIRD in Supabase SQL Editor (AFTER testing your application!)
-- Date: October 21, 2025

-- STEP 1: Remove rating column
ALTER TABLE travel_packages DROP COLUMN IF EXISTS rating;

-- STEP 2: Remove review_count column  
ALTER TABLE travel_packages DROP COLUMN IF EXISTS review_count;

-- STEP 3: Remove mobile_number column
ALTER TABLE travel_packages DROP COLUMN IF EXISTS mobile_number;

-- Verify the columns were removed
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
ORDER BY ordinal_position;