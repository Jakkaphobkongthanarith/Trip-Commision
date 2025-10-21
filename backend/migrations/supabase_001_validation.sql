-- Supabase Pre-Migration Validation
-- Run this FIRST in Supabase SQL Editor
-- Date: October 21, 2025

-- Check current table structure
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
    ROUND(AVG(rating), 2) as avg_rating,
    MAX(review_count) as max_review_count
FROM travel_packages
WHERE rating IS NOT NULL OR review_count IS NOT NULL OR mobile_number IS NOT NULL;

-- Check for orphaned records
SELECT 
    'Bookings without packages' as check_type,
    COUNT(*) as count
FROM bookings b
LEFT JOIN travel_packages tp ON b.package_id = tp.id
WHERE tp.id IS NULL

UNION ALL

SELECT 
    'Reviews without packages' as check_type,
    COUNT(*) as count
FROM reviews r
LEFT JOIN travel_packages tp ON r.package_id = tp.id
WHERE tp.id IS NULL;

-- Compare stored vs computed ratings (sample)
SELECT 
    tp.id,
    tp.rating as stored_rating,
    ROUND(COALESCE(AVG(r.rating), 0), 2) as computed_rating,
    tp.review_count as stored_count,
    COUNT(r.id) as computed_count
FROM travel_packages tp
LEFT JOIN reviews r ON tp.id = r.package_id
GROUP BY tp.id, tp.rating, tp.review_count
LIMIT 5;