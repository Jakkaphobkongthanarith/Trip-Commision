package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CommissionController struct {
	DB *gorm.DB
}

func NewCommissionController(db *gorm.DB) *CommissionController {
	return &CommissionController{DB: db}
}

// PackageCommissionData โครงสร้างข้อมูล commission แต่ละแพ็กเกจ
type PackageCommissionData struct {
	PackageID        string  `json:"package_id"`
	PackageName      string  `json:"package_name"`
	MaxUses          int     `json:"max_uses"`
	CurrentUses      int     `json:"current_uses"`
	UsageRate        float64 `json:"usage_rate"`
	CommissionRate   float64 `json:"commission_rate"`
	TotalRevenue     float64 `json:"total_revenue"`
	CommissionAmount float64 `json:"commission_amount"`
}

// MonthlyCommissionResponse response สำหรับ API
type MonthlyCommissionResponse struct {
	Month           int                     `json:"month"`
	Year            int                     `json:"year"`
	Packages        []PackageCommissionData `json:"packages"`
	TotalCommission float64                 `json:"total_commission"`
}

// GetAdvertiserMonthlyCommissions คำนวณค่าคอมมิชชั่นรายเดือนของ advertiser
func (cc *CommissionController) GetAdvertiserMonthlyCommissions(c *gin.Context) {
	advertiserID := c.Param("advertiser_id")
	
	// รับ query parameters สำหรับเดือน/ปี (default เป็นเดือนปัจจุบัน)
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	
	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month parameter"})
		return
	}
	
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2020 || year > 2030 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid year parameter"})
		return
	}
	
	// สร้างช่วงวันที่สำหรับเดือนที่เลือก
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second) // วันสุดท้ายของเดือน
	
	// Query ข้อมูล discount codes ของ advertiser และคำนวณ commission
	var packages []PackageCommissionData
	
	query := `
		WITH package_stats AS (
			SELECT 
				dc.package_id,
				tp.title as package_name,
				dc.max_uses,
				COUNT(CASE WHEN b.payment_status = 'completed' 
						AND b.discount_code_id = dc.id 
						AND b.booking_date >= ? 
						AND b.booking_date <= ? 
					THEN 1 END) as current_uses,
				COALESCE(SUM(CASE WHEN b.payment_status = 'completed' 
						AND b.booking_date >= ? 
						AND b.booking_date <= ? 
					THEN b.final_amount ELSE 0 END), 0) as total_revenue
			FROM discount_codes dc
			LEFT JOIN travel_packages tp ON dc.package_id = tp.id
			LEFT JOIN bookings b ON b.package_id = dc.package_id
			WHERE dc.advertiser_id = ?
			GROUP BY dc.package_id, tp.title, dc.max_uses
		)
		SELECT 
			package_id,
			package_name,
			max_uses,
			current_uses,
			CASE 
				WHEN max_uses > 0 THEN (current_uses::float / max_uses::float * 100)
				ELSE 0 
			END as usage_rate,
			CASE 
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) = 100 THEN 10
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) >= 75 THEN 5
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) > 50 THEN 3
				ELSE 0
			END as commission_rate,
			total_revenue,
			CASE 
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) = 100 THEN total_revenue * 0.10
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) >= 75 THEN total_revenue * 0.05
				WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) > 50 THEN total_revenue * 0.03
				ELSE 0
			END as commission_amount
		FROM package_stats
		WHERE current_uses > 0 OR total_revenue > 0
		ORDER BY commission_amount DESC
	`
	
	rows, err := cc.DB.Raw(query, startDate, endDate, startDate, endDate, advertiserID).Rows()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to calculate commissions",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()
	
	var totalCommission float64 = 0
	
	for rows.Next() {
		var pkg PackageCommissionData
		err := rows.Scan(
			&pkg.PackageID,
			&pkg.PackageName,
			&pkg.MaxUses,
			&pkg.CurrentUses,
			&pkg.UsageRate,
			&pkg.CommissionRate,
			&pkg.TotalRevenue,
			&pkg.CommissionAmount,
		)
		if err != nil {
			continue
		}
		
		packages = append(packages, pkg)
		totalCommission += pkg.CommissionAmount
	}
	
	response := MonthlyCommissionResponse{
		Month:           month,
		Year:            year,
		Packages:        packages,
		TotalCommission: totalCommission,
	}
	
	c.JSON(http.StatusOK, response)
}

// GetAdvertiserCommissionSummary สรุปภาพรวมค่าคอมมิชชั่นทั้งหมด
func (cc *CommissionController) GetAdvertiserCommissionSummary(c *gin.Context) {
	advertiserID := c.Param("advertiser_id")
	
	// สรุปค่าคอมมิชชั่นย้อนหลัง 12 เดือน
	var monthlySummary []gin.H
	
	for i := 0; i < 12; i++ {
		targetDate := time.Now().AddDate(0, -i, 0)
		month := int(targetDate.Month())
		year := targetDate.Year()
		
		startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)
		
		var totalCommission float64
		
		query := `
			WITH package_stats AS (
				SELECT 
					COUNT(CASE WHEN b.payment_status = 'completed' 
							AND b.discount_code_id = dc.id 
							AND b.booking_date >= ? 
							AND b.booking_date <= ? 
						THEN 1 END) as current_uses,
					dc.max_uses,
					COALESCE(SUM(CASE WHEN b.payment_status = 'completed' 
							AND b.booking_date >= ? 
							AND b.booking_date <= ? 
						THEN b.final_amount ELSE 0 END), 0) as total_revenue
				FROM discount_codes dc
				LEFT JOIN bookings b ON b.package_id = dc.package_id
				WHERE dc.advertiser_id = ?
				GROUP BY dc.id, dc.max_uses
			)
			SELECT 
				COALESCE(SUM(
					CASE 
						WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) = 100 THEN total_revenue * 0.10
						WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) >= 75 THEN total_revenue * 0.05
						WHEN max_uses > 0 AND (current_uses::float / max_uses::float * 100) > 50 THEN total_revenue * 0.03
						ELSE 0
					END
				), 0) as total_commission
			FROM package_stats
		`
		
		err := cc.DB.Raw(query, startDate, endDate, startDate, endDate, advertiserID).Scan(&totalCommission).Error
		if err != nil {
			totalCommission = 0
		}
		
		monthlySummary = append(monthlySummary, gin.H{
			"month": month,
			"year": year,
			"total_commission": totalCommission,
			"month_name": targetDate.Format("Jan 2006"),
		})
	}
	
	c.JSON(http.StatusOK, gin.H{
		"advertiser_id": advertiserID,
		"monthly_summary": monthlySummary,
	})
}