package controllers

import (
	"fmt"
	"net/http"
	"time"

	"trip-trader-backend/models"
	"trip-trader-backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ManagerController struct {
	DB *gorm.DB
}

type DashboardStats struct {
	TotalUsers        int64   `json:"totalUsers"`
	TotalAdvertisers  int64   `json:"totalAdvertisers"`
	TotalPackages     int64   `json:"totalPackages"`
	ActivePackages    int64   `json:"activePackages"`
	TotalBookings     int64   `json:"totalBookings"`
	ThisMonthBookings int64   `json:"thisMonthBookings"`
	TotalRevenue      float64 `json:"totalRevenue"`
}

type PerformanceAnalysisResponse struct {
	Status            string                              `json:"status"`
	QueryPerformance  services.QueryPerformanceMetrics   `json:"query_performance"`
	RecommendedIndexes []string                           `json:"recommended_indexes"`
	Timestamp         time.Time                          `json:"timestamp"`
}

type RecentBooking struct {
	ID           string  `json:"id"`
	PackageTitle string  `json:"package_title"`
	UserName     string  `json:"user_name"`
	BookingDate  string  `json:"booking_date"`
	TotalPrice   float64 `json:"total_price"`
	Status       string  `json:"status"`
}

type RecentPackage struct {
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	Location       string  `json:"location"`
	Price          float64 `json:"price"`
	CreatedAt      string  `json:"created_at"`
	AdvertiserName string  `json:"advertiser_name"`
}

// GetDashboardStats - ดึงสถิติสำหรับ Manager Dashboard (ใช้ GORM ORM)
func (mc *ManagerController) GetDashboardStats(c *gin.Context) {
	var stats DashboardStats

	// Count total users ด้วย GORM Model
	mc.DB.Model(&models.UserRole{}).Where("role != ?", "manager").Count(&stats.TotalUsers)

	// Count total advertisers ด้วย GORM Model
	mc.DB.Model(&models.UserRole{}).Where("role = ?", "advertiser").Count(&stats.TotalAdvertisers)

	// Count total packages ด้วย GORM Model
	mc.DB.Model(&models.TravelPackage{}).Count(&stats.TotalPackages)

	// Count active packages ด้วย GORM Model
	mc.DB.Model(&models.TravelPackage{}).Where("is_active = ?", true).Count(&stats.ActivePackages)

	// Count total bookings ด้วย GORM Model
	mc.DB.Model(&models.Booking{}).Count(&stats.TotalBookings)

	// Count this month bookings ด้วย GORM Model
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	mc.DB.Model(&models.Booking{}).
		Where("created_at >= ?", firstOfMonth).
		Count(&stats.ThisMonthBookings)

	// Calculate total revenue ด้วย GORM Model (sum of all confirmed bookings)
	type RevenueResult struct {
		Total float64 `gorm:"column:total"`
	}
	var revenue RevenueResult
	mc.DB.Model(&models.Booking{}).
		Select("COALESCE(SUM(final_amount), 0) as total").
		Where("status = ?", "confirmed").
		Scan(&revenue)
	stats.TotalRevenue = revenue.Total

	c.JSON(http.StatusOK, stats)
}

// GetRecentBookings - ดึงการจองล่าสุด 10 รายการ (ใช้ GORM ORM)
func (mc *ManagerController) GetRecentBookings(c *gin.Context) {
	var bookings []RecentBooking

	// ใช้ GORM ORM แทน raw SQL เพื่อความปลอดภัย
	type BookingResult struct {
		ID           string  `gorm:"column:id"`
		PackageTitle string  `gorm:"column:package_title"`
		UserName     string  `gorm:"column:user_name"`
		BookingDate  string  `gorm:"column:booking_date"`
		TotalPrice   float64 `gorm:"column:total_price"`
		Status       string  `gorm:"column:status"`
	}

	var results []BookingResult

	err := mc.DB.Table("bookings b").
		Select(`b.id, 
				tp.title as package_title,
				b.contact_name as user_name,
				DATE(b.created_at) as booking_date,
				b.final_amount as total_price,
				b.status`).
		Joins("LEFT JOIN travel_packages tp ON b.package_id = tp.id").
		Order("b.created_at DESC").
		Limit(10).
		Find(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch recent bookings",
			"details": err.Error(),
		})
		return
	}

	// แปลงผลลัพธ์
	for _, result := range results {
		bookings = append(bookings, RecentBooking{
			ID:           result.ID,
			PackageTitle: result.PackageTitle,
			UserName:     result.UserName,
			BookingDate:  result.BookingDate,
			TotalPrice:   result.TotalPrice,
			Status:       result.Status,
		})
	}

	c.JSON(http.StatusOK, bookings)
}

// GetRecentPackages - ดึงแพคเกจใหม่ล่าสุด 10 รายการ พร้อม advertiser name จาก profiles (ใช้ GORM relationships)
func (mc *ManagerController) GetRecentPackages(c *gin.Context) {
	var packages []RecentPackage
	var travelPackages []models.TravelPackage

	// ใช้ GORM Preload เพื่อ JOIN tables ตามที่ต้องการ:
	// travel_packages -> package_advertisers -> users -> profiles
	err := mc.DB.
    Where("is_active = ?", true).
    Order("created_at DESC").
    Limit(10).
    Find(&travelPackages).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch recent packages",
			"details": err.Error(),
		})
		return
	}

	// แปลงผลลัพธ์เป็น RecentPackage พร้อมจัดการ advertiser names
	for _, pkg := range travelPackages {
		advertiserName := "ไม่ระบุ"
		
		// ตรวจสอบและสร้างชื่อ advertiser จาก profiles
		if len(pkg.Advertisers) > 0 {
			var names []string
			for _, advertiser := range pkg.Advertisers {
				// ใช้ Profile.DisplayName จาก relationship
				if advertiser.Profile != nil && advertiser.Profile.DisplayName != "" {
					names = append(names, advertiser.Profile.DisplayName)
				}
			}
			
			if len(names) > 0 {
				if len(names) == 1 {
					advertiserName = names[0]
				} else {
					advertiserName = names[0] + " และ " + fmt.Sprintf("%d", len(names)-1) + " คนอื่นๆ"
				}
			}
		}

		packages = append(packages, RecentPackage{
			ID:             pkg.ID.String(),
			Title:          pkg.Title,
			Location:       pkg.Location,
			Price:          pkg.Price,
			CreatedAt:      pkg.CreatedAt.Format("2006-01-02"),
			AdvertiserName: advertiserName,
		})
	}

	c.JSON(http.StatusOK, packages)
}

// GetUserStatistics - สถิติผู้ใช้รายละเอียด (ใช้ GORM ORM)
func (mc *ManagerController) GetUserStatistics(c *gin.Context) {
	type UserStats struct {
		Role  string `json:"role"`
		Count int64  `json:"count"`
	}

	var userStats []UserStats
	
	// ใช้ GORM ORM แทน raw SQL เพื่อความปลอดภัย
	err := mc.DB.Table("user_roles").
		Select("role, COUNT(*) as count").
		Where("role != ?", "manager").
		Group("role").
		Find(&userStats).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch user statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, userStats)
}

// GetPackageStatistics - สถิติแพคเกจรายละเอียด (ใช้ GORM ORM)
func (mc *ManagerController) GetPackageStatistics(c *gin.Context) {
	type PackageStats struct {
		TotalPackages    int64   `json:"total_packages"`
		ActivePackages   int64   `json:"active_packages"`
		InactivePackages int64   `json:"inactive_packages"`
		AvgPrice         float64 `json:"avg_price"`
		TopLocation      string  `json:"top_location"`
	}

	var stats PackageStats

	// Count packages by status ด้วย GORM Model
	mc.DB.Model(&models.TravelPackage{}).Count(&stats.TotalPackages)
	mc.DB.Model(&models.TravelPackage{}).Where("is_active = ?", true).Count(&stats.ActivePackages)
	mc.DB.Model(&models.TravelPackage{}).Where("is_active = ?", false).Count(&stats.InactivePackages)

	// Calculate average price ด้วย GORM Model
	type AvgPriceResult struct {
		Average float64 `gorm:"column:average"`
	}
	var avgPrice AvgPriceResult
	mc.DB.Model(&models.TravelPackage{}).
		Select("COALESCE(AVG(price), 0) as average").
		Where("is_active = ?", true).
		Scan(&avgPrice)
	stats.AvgPrice = avgPrice.Average

	// Find top location ด้วย GORM Model
	type LocationResult struct {
		Location string `gorm:"column:location"`
	}
	var topLocation LocationResult
	mc.DB.Model(&models.TravelPackage{}).
		Select("location").
		Where("is_active = ?", true).
		Group("location").
		Order("COUNT(*) DESC").
		Limit(1).
		Scan(&topLocation)
	stats.TopLocation = topLocation.Location

	c.JSON(http.StatusOK, stats)
}

// GetMonthlyBookingStats - สถิติการจองรายเดือน (12 เดือนล่าสุด) ใช้ GORM ORM + PostgreSQL
func (mc *ManagerController) GetMonthlyBookingStats(c *gin.Context) {
	type MonthlyStats struct {
		Month    string  `json:"month"`
		Bookings int64   `json:"bookings"`
		Revenue  float64 `json:"revenue"`
	}

	var monthlyStats []MonthlyStats

	// ใช้ GORM ORM แทน raw SQL เพื่อความปลอดภัย
	// คำนวณวันที่ 12 เดือนที่แล้ว
	twelveMonthsAgo := time.Now().AddDate(0, -12, 0)

	// ใช้ PostgreSQL TO_CHAR function ด้วย GORM
	type MonthlyResult struct {
		Month    string  `gorm:"column:month"`
		Bookings int64   `gorm:"column:bookings"`
		Revenue  float64 `gorm:"column:revenue"`
	}

	var results []MonthlyResult
	
	err := mc.DB.Model(&models.Booking{}).
		Select(`TO_CHAR(created_at, 'YYYY-MM') as month,
				COUNT(*) as bookings,
				COALESCE(SUM(final_amount), 0) as revenue`).
		Where("created_at >= ? AND status = ?", twelveMonthsAgo, "confirmed").
		Group("TO_CHAR(created_at, 'YYYY-MM')").
		Order("month DESC").
		Limit(12).
		Find(&results).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch monthly booking statistics",
			"details": err.Error(),
		})
		return
	}

	// แปลงผลลัพธ์
	for _, result := range results {
		monthlyStats = append(monthlyStats, MonthlyStats{
			Month:    result.Month,
			Bookings: result.Bookings,
			Revenue:  result.Revenue,
		})
	}

	c.JSON(http.StatusOK, monthlyStats)
}

// PerformanceAnalysis - วิเคราะห์ performance ของระบบ database
func (mc *ManagerController) PerformanceAnalysis(c *gin.Context) {
	perfMonitor := &services.PerformanceMonitor{DB: mc.DB}
	
	// Run performance analysis
	perfMonitor.AnalyzeQueryPerformance()
	
	// Get recommended indexes
	recommendedIndexes := perfMonitor.GetRecommendedIndexes()
	
	response := PerformanceAnalysisResponse{
		Status:             "completed",
		RecommendedIndexes: recommendedIndexes,
		Timestamp:         time.Now(),
	}
	
	c.JSON(http.StatusOK, response)
}