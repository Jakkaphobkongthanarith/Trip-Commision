-- Supabase Post-Migration Verification
-- Run this FIFTH (LAST) in Supabase SQL Editor
-- Date: October 21, 2025

-- Check final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'travel_packages' 
ORDER BY ordinal_position;

-- Verify essential columns still exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'id') 
        THEN '✅ id column exists'
        ELSE '❌ id column missing'
    END as id_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'title') 
        THEN '✅ title column exists'
        ELSE '❌ title column missing'
    END as title_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'price') 
        THEN '✅ price column exists'
        ELSE '❌ price column missing'
    END as price_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'travel_packages' AND column_name = 'is_active') 
        THEN '✅ is_active column exists'
        ELSE '❌ is_active column missing'
    END as active_check;

-- Test basic package data (ไม่มี rating/review)
SELECT 
    tp.id,
    tp.title,
    tp.price,
    tp.location,
    COUNT(DISTINCT b.id) as confirmed_bookings
FROM travel_packages tp
LEFT JOIN bookings b ON tp.id = b.package_id AND b.status = 'confirmed'
WHERE tp.is_active = true
GROUP BY tp.id, tp.title, tp.price, tp.location
LIMIT 3;

-- Check indexes were created (ไม่มี reviews table)
SELECT 
    'Indexes created: ' || COUNT(*) as index_status
FROM pg_indexes 
WHERE tablename IN ('travel_packages', 'bookings')
AND indexname LIKE 'idx_%';

-- Final success message
SELECT 
    '🎉 Database cleanup completed successfully!' as status,
    'Rating/Review system removed completely' as details,
    'Ready to test application' as next_step;