-- Supabase Performance Indexes Creation
-- Run this FOURTH in Supabase SQL Editor
-- Date: October 21, 2025

-- Index 1: travel_packages.is_active (most important)
CREATE INDEX IF NOT EXISTS idx_travel_packages_is_active 
ON travel_packages(is_active) 
WHERE is_active = true;

-- Index 2: bookings table for confirmed bookings
CREATE INDEX IF NOT EXISTS idx_bookings_package_id_status 
ON bookings(package_id, status) 
WHERE status = 'confirmed';

-- Index 3: advertiser relationship
CREATE INDEX IF NOT EXISTS idx_travel_packages_advertiser_id 
ON travel_packages(advertiser_id) 
WHERE advertiser_id IS NOT NULL;

-- Index 5: time-based booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_created_at_status 
ON bookings(created_at, status) 
WHERE status = 'confirmed';

-- Verify indexes were created (ไม่มี reviews table)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('travel_packages', 'bookings')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;