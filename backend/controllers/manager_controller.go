package controllers

import (
	"fmt"
	"net/http"
	"time"

	"trip-trader-backend/models"

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

// GetDashboardStats - ดึงสถิติสำหรับ Manager Dashboard
func (mc *ManagerController) GetDashboardStats(c *gin.Context) {
	var stats DashboardStats

	// Count total users (excluding managers)
	mc.DB.Table("users").Where("role != ?", "manager").Count(&stats.TotalUsers)

	// Count total advertisers
	mc.DB.Table("users").Where("role = ?", "advertiser").Count(&stats.TotalAdvertisers)

	// Count total packages
	mc.DB.Table("travel_packages").Count(&stats.TotalPackages)

	// Count active packages
	mc.DB.Table("travel_packages").Where("is_active = ?", true).Count(&stats.ActivePackages)

	// Count total bookings
	mc.DB.Table("bookings").Count(&stats.TotalBookings)

	// Count this month bookings
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	mc.DB.Table("bookings").
		Where("created_at >= ?", firstOfMonth).
		Count(&stats.ThisMonthBookings)

	// Calculate total revenue (sum of all confirmed bookings)
	mc.DB.Table("bookings").
		Where("status = ?", "confirmed").
		Select("COALESCE(SUM(final_amount), 0)").
		Scan(&stats.TotalRevenue)

	c.JSON(http.StatusOK, stats)
}

// GetRecentBookings - ดึงการจองล่าสุด 10 รายการ
func (mc *ManagerController) GetRecentBookings(c *gin.Context) {
	var bookings []RecentBooking

	query := `
		SELECT 
			b.id,
			tp.title as package_title,
			b.contact_name as user_name,
			DATE(b.created_at) as booking_date,
			b.final_amount as total_price,
			b.status
		FROM bookings b
		LEFT JOIN travel_packages tp ON b.package_id = tp.id
		ORDER BY b.created_at DESC
		LIMIT 10
	`

	if err := mc.DB.Raw(query).Scan(&bookings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch recent bookings",
		})
		return
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
		Preload("Advertisers").          // JOIN package_advertisers table
		Preload("Advertisers.Profile").  // JOIN profiles table
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

// GetUserStatistics - สถิติผู้ใช้รายละเอียด
func (mc *ManagerController) GetUserStatistics(c *gin.Context) {
	type UserStats struct {
		Role  string `json:"role"`
		Count int64  `json:"count"`
	}

	var userStats []UserStats
	
	query := `
		SELECT role, COUNT(*) as count 
		FROM users 
		WHERE role != 'manager'
		GROUP BY role
	`

	if err := mc.DB.Raw(query).Scan(&userStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch user statistics",
		})
		return
	}

	c.JSON(http.StatusOK, userStats)
}

// GetPackageStatistics - สถิติแพคเกจรายละเอียด
func (mc *ManagerController) GetPackageStatistics(c *gin.Context) {
	type PackageStats struct {
		TotalPackages    int64   `json:"total_packages"`
		ActivePackages   int64   `json:"active_packages"`
		InactivePackages int64   `json:"inactive_packages"`
		AvgPrice         float64 `json:"avg_price"`
		TopLocation      string  `json:"top_location"`
	}

	var stats PackageStats

	// Count packages by status
	mc.DB.Table("travel_packages").Count(&stats.TotalPackages)
	mc.DB.Table("travel_packages").Where("is_active = ?", true).Count(&stats.ActivePackages)
	mc.DB.Table("travel_packages").Where("is_active = ?", false).Count(&stats.InactivePackages)

	// Calculate average price
	mc.DB.Table("travel_packages").
		Where("is_active = ?", true).
		Select("COALESCE(AVG(price), 0)").
		Scan(&stats.AvgPrice)

	// Find top location
	mc.DB.Table("travel_packages").
		Select("location").
		Where("is_active = ?", true).
		Group("location").
		Order("COUNT(*) DESC").
		Limit(1).
		Scan(&stats.TopLocation)

	c.JSON(http.StatusOK, stats)
}

// GetMonthlyBookingStats - สถิติการจองรายเดือน (12 เดือนล่าสุด)
func (mc *ManagerController) GetMonthlyBookingStats(c *gin.Context) {
	type MonthlyStats struct {
		Month    string  `json:"month"`
		Bookings int64   `json:"bookings"`
		Revenue  float64 `json:"revenue"`
	}

	var monthlyStats []MonthlyStats

	query := `
		SELECT 
			TO_CHAR(created_at, 'YYYY-MM') as month,
			COUNT(*) as bookings,
			COALESCE(SUM(final_amount), 0) as revenue
		FROM bookings 
		WHERE created_at >= NOW() - INTERVAL '12 months'
			AND status = 'confirmed'
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month DESC
		LIMIT 12
	`

	if err := mc.DB.Raw(query).Scan(&monthlyStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch monthly booking statistics",
		})
		return
	}

	c.JSON(http.StatusOK, monthlyStats)
}