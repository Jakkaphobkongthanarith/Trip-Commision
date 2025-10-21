-- Database Optimization: Create Performance Indexes
-- Date: October 21, 2025
-- Description: Create indexes to optimize computed field queries
-- Version: 1.0

-- ================================================================
-- PERFORMANCE INDEXES FOR COMPUTED FIELDS
-- ================================================================

BEGIN;

-- Index 1: travel_packages.is_active (most frequently filtered)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_travel_packages_is_active 
ON travel_packages(is_active) 
WHERE is_active = true;

-- Index 2: bookings table optimization for status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_package_id_status 
ON bookings(package_id, status) 
WHERE status = 'confirmed';

-- Index 3: reviews table optimization for package stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_package_id_rating 
ON reviews(package_id, rating);

-- Index 4: travel_packages advertiser relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_travel_packages_advertiser_id 
ON travel_packages(advertiser_id) 
WHERE advertiser_id IS NOT NULL;

-- Index 5: bookings created_at for time-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at_status 
ON bookings(created_at, status) 
WHERE status = 'confirmed';

-- Index 6: reviews created_at for recent reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_at 
ON reviews(created_at DESC);

-- Index 7: travel_packages created_at for recent packages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_travel_packages_created_at 
ON travel_packages(created_at DESC) 
WHERE is_active = true;

-- Index 8: Composite index for package listing with filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_travel_packages_active_price 
ON travel_packages(is_active, price) 
WHERE is_active = true;

COMMIT;

-- ================================================================
-- INDEX VERIFICATION
-- ================================================================

-- Check all indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('travel_packages', 'bookings', 'reviews')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ================================================================
-- PERFORMANCE STATISTICS
-- ================================================================

-- Update table statistics for query planner
ANALYZE travel_packages;
ANALYZE bookings;
ANALYZE reviews;

-- Check table sizes and index usage
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('travel_packages', 'bookings', 'reviews')
AND attname IN ('is_active', 'status', 'package_id', 'rating')
ORDER BY tablename, attname;

-- ================================================================
-- MONITORING QUERIES
-- ================================================================

-- Query to monitor index usage (run after some application usage)
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes 
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

RAISE NOTICE 'All performance indexes created successfully!';
RAISE NOTICE 'Indexes created:';
RAISE NOTICE '- idx_travel_packages_is_active: For active package filtering';
RAISE NOTICE '- idx_bookings_package_id_status: For booking statistics';
RAISE NOTICE '- idx_reviews_package_id_rating: For rating calculations';
RAISE NOTICE '- idx_travel_packages_advertiser_id: For advertiser relationships';
RAISE NOTICE '- idx_bookings_created_at_status: For time-based booking queries';
RAISE NOTICE '- idx_reviews_created_at: For recent reviews';
RAISE NOTICE '- idx_travel_packages_created_at: For recent packages';
RAISE NOTICE '- idx_travel_packages_active_price: For price filtering';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Monitor application performance';
RAISE NOTICE '2. Check index usage with monitoring queries';
RAISE NOTICE '3. Adjust indexes based on query patterns';