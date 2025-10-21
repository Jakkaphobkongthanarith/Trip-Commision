package services

import (
	"log"
	"time"
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PerformanceMonitor - Service สำหรับ monitor performance ของ computed fields
type PerformanceMonitor struct {
	DB *gorm.DB
}

// QueryPerformanceMetrics - เก็บ metrics ของ query performance
type QueryPerformanceMetrics struct {
	Operation    string        `json:"operation"`
	Duration     time.Duration `json:"duration"`
	RecordCount  int           `json:"record_count"`
	Timestamp    time.Time     `json:"timestamp"`
	QueryType    string        `json:"query_type"` // "computed_fields", "direct_query", etc.
}

// MonitorPackageStatsQuery - Monitor performance ของ package stats queries
func (pm *PerformanceMonitor) MonitorPackageStatsQuery(operation string, queryFunc func() (interface{}, error)) (interface{}, error) {
	startTime := time.Now()
	
	// Execute query
	result, err := queryFunc()
	
	// Calculate duration
	duration := time.Since(startTime)
	
	// Log performance metrics
	metrics := QueryPerformanceMetrics{
		Operation:   operation,
		Duration:    duration,
		Timestamp:   startTime,
		QueryType:   "computed_fields",
	}
	
	// Count records if result is slice
	switch v := result.(type) {
	case []models.TravelPackage:
		metrics.RecordCount = len(v)
	case *models.TravelPackage:
		if v != nil {
			metrics.RecordCount = 1
		}
	}
	
	// Log warning if query takes too long
	if duration > 1*time.Second {
		log.Printf("⚠️  SLOW QUERY WARNING: %s took %v for %d records", 
			operation, duration, metrics.RecordCount)
	} else {
		log.Printf("✅ Query Performance: %s completed in %v for %d records", 
			operation, duration, metrics.RecordCount)
	}
	
	return result, err
}

// GetPackageWithStatsMonitored - GetPackageWithStats พร้อม performance monitoring
func (pm *PerformanceMonitor) GetPackageWithStatsMonitored(packageID uuid.UUID) (*models.TravelPackage, error) {
	statsService := &PackageStatsService{DB: pm.DB}
	
	result, err := pm.MonitorPackageStatsQuery("GetPackageWithStats", func() (interface{}, error) {
		return statsService.GetPackageWithStats(packageID)
	})
	
	if err != nil {
		return nil, err
	}
	
	return result.(*models.TravelPackage), nil
}

// GetAllPackagesWithStatsMonitored - GetAllPackagesWithStats พร้อม performance monitoring
func (pm *PerformanceMonitor) GetAllPackagesWithStatsMonitored() ([]models.TravelPackage, error) {
	statsService := &PackageStatsService{DB: pm.DB}
	
	result, err := pm.MonitorPackageStatsQuery("GetAllPackagesWithStats", func() (interface{}, error) {
		return statsService.GetAllPackagesWithStats()
	})
	
	if err != nil {
		return nil, err
	}
	
	return result.([]models.TravelPackage), nil
}

// GetActivePackagesWithPaginationMonitored - Pagination query พร้อม monitoring
func (pm *PerformanceMonitor) GetActivePackagesWithPaginationMonitored(limit, offset int) ([]models.TravelPackage, int64, error) {
	statsService := &PackageStatsService{DB: pm.DB}
	
	startTime := time.Now()
	packages, total, err := statsService.GetActivePackagesWithPagination(limit, offset)
	duration := time.Since(startTime)
	
	// Log pagination performance
	log.Printf("📄 Pagination Query: %d records (offset %d, limit %d) in %v", 
		len(packages), offset, limit, duration)
	
	if duration > 500*time.Millisecond {
		log.Printf("⚠️  PAGINATION SLOW: Consider indexing or query optimization")
	}
	
	return packages, total, err
}

// AnalyzeQueryPerformance - วิเคราะห์ performance และให้คำแนะนำ
func (pm *PerformanceMonitor) AnalyzeQueryPerformance() {
	log.Println("🔍 Starting Performance Analysis...")
	
	// Test individual package query (ไม่มี Reviews)
	startTime := time.Now()
	var pkg models.TravelPackage
	pm.DB.Preload("Bookings").First(&pkg)
	singleQueryTime := time.Since(startTime)
	
	// Test bulk query (ไม่มี Reviews)
	startTime = time.Now()
	var packages []models.TravelPackage
	pm.DB.Preload("Bookings").Limit(10).Find(&packages)
	bulkQueryTime := time.Since(startTime)
	
	log.Printf("📊 Performance Analysis Results:")
	log.Printf("   Single Package Query: %v", singleQueryTime)
	log.Printf("   Bulk Query (10 packages): %v", bulkQueryTime)
	log.Printf("   Average per package: %v", bulkQueryTime/10)
	
	// Recommendations
	if singleQueryTime > 100*time.Millisecond {
		log.Printf("🔧 Recommendation: Consider adding database indexes on frequently queried fields")
	}
	
	if bulkQueryTime > 500*time.Millisecond {
		log.Printf("🔧 Recommendation: Consider implementing caching layer for bulk queries")
	}
	
	// Check for missing indexes
	pm.checkIndexes()
}

// checkIndexes - ตรวจสอบ indexes ที่สำคัญ
func (pm *PerformanceMonitor) checkIndexes() {
	log.Println("🔍 Checking Database Indexes...")
	
	// Check for important indexes (ไม่มี reviews indexes)
	indexes := []string{
		"travel_packages_package_id_idx",  // package_id foreign key
		"bookings_package_id_idx",         // bookings.package_id
		"travel_packages_is_active_idx",   // is_active filter
	}
	
	for _, indexName := range indexes {
		var exists bool
		pm.DB.Raw(`
			SELECT EXISTS (
				SELECT 1 FROM pg_indexes 
				WHERE indexname = ?
			)`, indexName).Scan(&exists)
		
		if !exists {
			log.Printf("⚠️  Missing Index: %s", indexName)
		} else {
			log.Printf("✅ Index Found: %s", indexName)
		}
	}
}

// GetRecommendedIndexes - แนะนำ indexes ที่ควรสร้าง (ไม่มี reviews)
func (pm *PerformanceMonitor) GetRecommendedIndexes() []string {
	return []string{
		"CREATE INDEX IF NOT EXISTS travel_packages_is_active_idx ON travel_packages(is_active);",
		"CREATE INDEX IF NOT EXISTS bookings_package_id_status_idx ON bookings(package_id, status);",
		"CREATE INDEX IF NOT EXISTS travel_packages_advertiser_id_idx ON travel_packages(advertiser_id);",
	}
}