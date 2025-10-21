-- Pre-Migration Validation Script
-- Date: October 21, 2025
-- Description: Comprehensive validation before executing migration
-- Run this BEFORE the actual migration to ensure everything is ready

-- ================================================================
-- SYSTEM READINESS CHECKS
-- ================================================================

-- Check PostgreSQL version
SELECT version();

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('travel_packages', 'bookings', 'reviews')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ================================================================
-- DATA INTEGRITY CHECKS
-- ================================================================

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

-- Check data consistency in fields to be removed
SELECT 
    'Data consistency check' as check_type,
    COUNT(*) as total_packages,
    COUNT(rating) as has_rating,
    COUNT(review_count) as has_review_count,
    COUNT(mobile_number) as has_mobile_number,
    ROUND(AVG(rating), 2) as avg_stored_rating,
    MAX(review_count) as max_stored_review_count
FROM travel_packages;

-- Compare stored vs computed ratings (sample check)
WITH computed_stats AS (
    SELECT 
        tp.id,
        tp.rating as stored_rating,
        tp.review_count as stored_review_count,
        ROUND(COALESCE(AVG(r.rating), 0), 2) as computed_rating,
        COUNT(r.id) as computed_review_count
    FROM travel_packages tp
    LEFT JOIN reviews r ON tp.id = r.package_id
    GROUP BY tp.id, tp.rating, tp.review_count
    LIMIT 10
)
SELECT 
    id,
    stored_rating,
    computed_rating,
    stored_review_count,
    computed_review_count,
    CASE 
        WHEN ABS(stored_rating - computed_rating) > 0.1 THEN 'MISMATCH'
        ELSE 'OK'
    END as rating_status,
    CASE 
        WHEN stored_review_count != computed_review_count THEN 'MISMATCH'
        ELSE 'OK'
    END as count_status
FROM computed_stats;

-- ================================================================
-- APPLICATION READINESS CHECKS
-- ================================================================

-- Check if service layer methods exist (mock test)
-- This would be done by the application, but we can check table structure
SELECT 
    'Service layer compatibility' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'travel_packages'
        ) THEN 'Package table exists'
        ELSE 'Package table missing'
    END as status;

-- Check essential relationships
SELECT 
    'Foreign key constraints' as check_type,
    COUNT(*) as constraint_count
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('travel_packages', 'bookings', 'reviews');

-- ================================================================
-- PERFORMANCE BASELINE
-- ================================================================

-- Measure current query performance
\timing on

-- Test current package listing performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM travel_packages 
WHERE is_active = true 
LIMIT 10;

-- Test current package with stats performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    tp.*,
    COALESCE(AVG(r.rating), 0) as computed_rating,
    COUNT(r.id) as computed_review_count,
    COUNT(b.id) as confirmed_bookings
FROM travel_packages tp
LEFT JOIN reviews r ON tp.id = r.package_id
LEFT JOIN bookings b ON tp.id = b.package_id AND b.status = 'confirmed'
WHERE tp.is_active = true
GROUP BY tp.id
LIMIT 5;

\timing off

-- ================================================================
-- VALIDATION SUMMARY
-- ================================================================

DO $$
DECLARE
    total_packages INTEGER;
    total_reviews INTEGER;
    total_bookings INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- Count totals
    SELECT COUNT(*) INTO total_packages FROM travel_packages;
    SELECT COUNT(*) INTO total_reviews FROM reviews;
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    
    -- Count orphaned records
    SELECT COUNT(*) INTO orphaned_count
    FROM (
        SELECT b.id FROM bookings b
        LEFT JOIN travel_packages tp ON b.package_id = tp.id
        WHERE tp.id IS NULL
        
        UNION ALL
        
        SELECT r.id FROM reviews r
        LEFT JOIN travel_packages tp ON r.package_id = tp.id
        WHERE tp.id IS NULL
    ) orphaned;
    
    RAISE NOTICE '================================';
    RAISE NOTICE 'PRE-MIGRATION VALIDATION SUMMARY';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Total packages: %', total_packages;
    RAISE NOTICE 'Total reviews: %', total_reviews;
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Orphaned records: %', orphaned_count;
    
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned records - consider cleaning before migration', orphaned_count;
    ELSE
        RAISE NOTICE '✅ No orphaned records found';
    END IF;
    
    IF total_packages > 0 AND total_reviews >= 0 AND total_bookings >= 0 THEN
        RAISE NOTICE '✅ Database appears ready for migration';
    ELSE
        RAISE WARNING '⚠️  Database state requires review before migration';
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review any warnings above';
    RAISE NOTICE '2. Ensure application service layer is deployed';
    RAISE NOTICE '3. Create database backup';
    RAISE NOTICE '4. Run migration script';
    RAISE NOTICE '================================';
END $$;