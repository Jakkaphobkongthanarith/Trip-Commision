-- Remove Rating and Review System Completely
-- Date: October 21, 2025
-- Description: Remove all rating/review related tables and columns

-- ================================================================
-- STEP 1: DROP REVIEWS TABLE (if exists)
-- ================================================================

-- Drop reviews table completely
DROP TABLE IF EXISTS reviews CASCADE;

-- ================================================================
-- STEP 2: REMOVE RATING COLUMNS FROM TRAVEL_PACKAGES
-- ================================================================

-- Remove rating column
ALTER TABLE travel_packages DROP COLUMN IF EXISTS rating;

-- Remove review_count column  
ALTER TABLE travel_packages DROP COLUMN IF EXISTS review_count;

-- Remove mobile_number column (unrelated but redundant)
ALTER TABLE travel_packages DROP COLUMN IF EXISTS mobile_number;

-- ================================================================
-- STEP 3: CLEAN UP ANY REVIEW-RELATED INDEXES
-- ================================================================

-- Drop any indexes related to reviews (if they exist)
DROP INDEX IF EXISTS idx_reviews_package_id;
DROP INDEX IF EXISTS idx_reviews_package_id_rating;
DROP INDEX IF EXISTS idx_reviews_created_at;

-- ================================================================
-- STEP 4: VERIFICATION
-- ================================================================

-- Check reviews table is gone
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews')
        THEN '❌ Reviews table still exists'
        ELSE '✅ Reviews table removed'
    END as reviews_table_status;

-- Check rating columns are gone from travel_packages
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'rating')
        THEN '❌ Rating column still exists'
        ELSE '✅ Rating column removed'
    END as rating_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'review_count')
        THEN '❌ Review_count column still exists'
        ELSE '✅ Review_count column removed'
    END as review_count_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'mobile_number')
        THEN '❌ Mobile_number column still exists'
        ELSE '✅ Mobile_number column removed'
    END as mobile_number_status;

-- Show final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
ORDER BY ordinal_position;

-- Success message
SELECT '🎉 Rating and Review system completely removed!' as status;