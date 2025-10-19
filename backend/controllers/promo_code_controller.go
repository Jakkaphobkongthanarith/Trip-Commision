package controllers

import (
	"fmt"
	"strconv"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DiscountCodeController struct {
	DB *gorm.DB
}

func NewDiscountCodeController(db *gorm.DB) *DiscountCodeController {
	return &DiscountCodeController{DB: db}
}

// GetAllDiscountCodes - Manager ดู discount codes ทั้งหมด (Advertiser-based)
func (dc *DiscountCodeController) GetAllDiscountCodes(c *gin.Context) {
	var discountCodes []models.DiscountCode
	if err := dc.DB.Preload("Advertiser").Find(&discountCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch discount codes"})
		return
	}

	var result []gin.H
	for _, code := range discountCodes {
		advertiserName := ""
		if code.Advertiser.Profile != nil && code.Advertiser.Profile.DisplayName != "" {
			advertiserName = code.Advertiser.Profile.DisplayName
		} else {
			advertiserName = code.Advertiser.Email
		}
		
		result = append(result, gin.H{
			"id":              code.ID,
			"code":           code.Code,
			"advertiser_id":  code.AdvertiserID,
			"advertiser_name": advertiserName,
			"discount_value": code.DiscountValue,
			"discount_type":  code.DiscountType,
			"commission_rate": code.CommissionRate,
			"is_active":      code.IsActive,
			"created_at":     code.CreatedAt,
		})
	}

	c.JSON(200, result)
}

// GetAllGlobalDiscountCodes - Manager ดู global discount codes
func (dc *DiscountCodeController) GetAllGlobalDiscountCodes(c *gin.Context) {
	var globalCodes []models.GlobalDiscountCode
	if err := dc.DB.Find(&globalCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch global discount codes"})
		return
	}

	c.JSON(200, globalCodes)
}

// ToggleDiscountCodeStatus - Manager เปิด/ปิดการใช้งาน discount code
func (dc *DiscountCodeController) ToggleDiscountCodeStatus(c *gin.Context) {
	codeID := c.Param("id")
	
	var req struct {
		IsActive bool `json:"is_active"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if err := dc.DB.Model(&models.DiscountCode{}).
		Where("id = ?", codeID).
		Update("is_active", req.IsActive).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update discount code status"})
		return
	}

	c.JSON(200, gin.H{"message": "Status updated successfully"})
}

// ToggleGlobalDiscountCodeStatus - Manager เปิด/ปิดการใช้งาน global discount code
func (dc *DiscountCodeController) ToggleGlobalDiscountCodeStatus(c *gin.Context) {
	codeID := c.Param("id")
	
	var req struct {
		IsActive bool `json:"is_active"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if err := dc.DB.Model(&models.GlobalDiscountCode{}).
		Where("id = ?", codeID).
		Update("is_active", req.IsActive).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update global discount code status"})
		return
	}

	c.JSON(200, gin.H{"message": "Status updated successfully"})
}

// CreateDiscountCodeForAdvertiser - Manager สร้างโค้ดส่วนลดให้ Advertiser สำหรับแพคเกจเฉพาะ
func (dc *DiscountCodeController) CreateDiscountCodeForAdvertiser(c *gin.Context) {
	var req struct {
		AdvertiserID    string  `json:"advertiser_id" binding:"required"`
		PackageID       string  `json:"package_id" binding:"required"`
		DiscountValue   float64 `json:"discount_value" binding:"required"`
		DiscountType    string  `json:"discount_type" binding:"required,oneof=percentage fixed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Parse UUIDs
	advertiserID, err := uuid.Parse(req.AdvertiserID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid advertiser ID"})
		return
	}

	packageID, err := uuid.Parse(req.PackageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID"})
		return
	}

	// ตรวจสอบว่าแพ็กเกจมีอยู่จริง
	var pkg models.TravelPackage
	if err := dc.DB.First(&pkg, packageID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}

	// ตรวจสอบว่า advertiser มีอยู่จริงและเป็น advertiser
	var advertiser models.User
	if err := dc.DB.Preload("Profile").First(&advertiser, advertiserID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Advertiser not found"})
		return
	}

	// ตรวจสอบว่าเป็น advertiser จริง
	var userRole models.UserRole
	if err := dc.DB.Where("user_id = ? AND role = ?", advertiserID, "advertiser").First(&userRole).Error; err != nil {
		c.JSON(403, gin.H{"error": "User is not an advertiser"})
		return
	}

	// ตรวจสอบว่ามี discount code สำหรับแพ็กเกจและ advertiser คู่นี้อยู่แล้วหรือไม่
	var existingCode models.DiscountCode
	if err := dc.DB.Where("package_id = ? AND advertiser_id = ?", packageID, advertiserID).First(&existingCode).Error; err == nil {
		c.JSON(400, gin.H{"error": "Discount code already exists for this package and advertiser"})
		return
	}

	// สร้างโค้ดอัตโนมัติ
	advertiserName := advertiser.Email
	if advertiser.Profile != nil && advertiser.Profile.DisplayName != "" {
		advertiserName = advertiser.Profile.DisplayName
	}

	// ใช้ discount value สำหรับสร้างโค้ด
	code := models.GenerateDiscountCode(advertiserName, req.DiscountValue)
	
	// ตรวจสอบว่าโค้ดซ้ำหรือไม่
	for {
		var duplicateCode models.DiscountCode
		if err := dc.DB.Where("code = ?", code).First(&duplicateCode).Error; err != nil {
			break // ไม่เจอโค้ดซ้ำ
		}
		code = models.GenerateDiscountCode(advertiserName, req.DiscountValue)
	}

	// คำนวณ commission rate อัตโนมัติ (ตัวอย่าง: ใช้ 5% สำหรับทุกกรณี)
	// สามารถปรับตามธุรกิจได้ เช่น:
	// - แพ็กเกจราคาสูง = commission สูง
	// - advertiser VIP = commission พิเศษ
	commissionRate := 5.0 // Default 5%
	if pkg.Price >= 10000 {
		commissionRate = 7.0 // ราคาสูง commission เพิ่ม
	}
	
	// สร้าง discount code ใหม่ (ไม่กำหนดเวลาหมดอายุและจำนวนการใช้)
	discountCode := models.DiscountCode{
		ID:             uuid.New(),
		Code:           code,
		AdvertiserID:   advertiserID,
		PackageID:      packageID,
		DiscountValue:  req.DiscountValue,
		DiscountType:   req.DiscountType,
		CommissionRate: commissionRate,
		MaxUses:        nil, // ไม่จำกัดจำนวนการใช้
		IsActive:       &[]bool{true}[0],
		ExpiresAt:      nil, // ไม่มีวันหมดอายุ (ใช้ตามแพ็กเกจ)
	}

	if err := dc.DB.Create(&discountCode).Error; err != nil {
		fmt.Printf("Error creating advertiser discount code: %v\n", err)
		c.JSON(500, gin.H{
			"error": "Failed to create discount code",
			"details": err.Error(),
		})
		return
	}

	// โหลดข้อมูล relationships
	dc.DB.Preload("Advertiser").Preload("Package").First(&discountCode, discountCode.ID)

	// ส่ง notification ให้ advertiser
	go SendNotificationToAdvertiser(discountCode.AdvertiserID, discountCode, dc.DB)

	c.JSON(201, gin.H{
		"message": "Discount code created successfully",
		"code":    discountCode,
	})
}

// CreateGlobalDiscountCode - Manager สร้างโค้ดส่วนลดสำหรับผู้ใช้ทั่วไป
func (dc *DiscountCodeController) CreateGlobalDiscountCode(c *gin.Context) {
	var req struct {
		DiscountValue float64 `json:"discount_value" binding:"required,min=1"`
		DiscountType  string  `json:"discount_type" binding:"required,oneof=percentage fixed"`
		MaxUses      *int    `json:"max_uses"`
		ExpiresAt    *string `json:"expires_at"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Parse expires_at
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		parsedTime, err := time.Parse("2006-01-02T15:04:05Z", *req.ExpiresAt)
		if err != nil {
			parsedTime, err = time.Parse("2006-01-02", *req.ExpiresAt)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid expires_at format"})
				return
			}
		}
		expiresAt = &parsedTime
	}

	// สร้างโค้ดอัตโนมัติ
	code := models.GenerateGlobalDiscountCode(req.DiscountValue)
	
	// ตรวจสอบว่าโค้ดซ้ำหรือไม่
	for {
		var existingCode models.GlobalDiscountCode
		if err := dc.DB.Where("code = ?", code).First(&existingCode).Error; err != nil {
			break // ไม่เจอโค้ดซ้ำ
		}
		code = models.GenerateGlobalDiscountCode(req.DiscountValue)
	}
	
	globalCode := models.GlobalDiscountCode{
		ID:           uuid.New(),
		Code:         code,
		DiscountValue: req.DiscountValue,
		DiscountType:  req.DiscountType,
		MaxUses:      req.MaxUses,
		CurrentUses:  0,
		IsActive:     true,
		ExpiresAt:    expiresAt,
	}

	if err := dc.DB.Create(&globalCode).Error; err != nil {
		// เพิ่ม detailed error logging
		fmt.Printf("Error creating global discount code: %v\n", err)
		c.JSON(500, gin.H{
			"error": "Failed to create global discount code",
			"details": err.Error(),
		})
		return
	}

	// ส่ง notification ให้ทุกคนเมื่อมีโค้ดส่วนลดทั่วไปใหม่
	go SendGlobalDiscountCodeNotification(globalCode, dc.DB)

	c.JSON(201, gin.H{
		"message": "Global discount code created successfully",
		"code":    globalCode,
	})
}

// GetDiscountCodesByAdvertiser - Advertiser ดูโค้ดของตัวเอง
func (dc *DiscountCodeController) GetDiscountCodesByAdvertiser(c *gin.Context) {
	advertiserID := c.Param("advertiser_id")

	var discountCodes []models.DiscountCode
	if err := dc.DB.Where("advertiser_id = ?", advertiserID).
		Preload("Advertiser").
		Preload("Package").
		Find(&discountCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch discount codes"})
		return
	}

	// คำนวณ current_uses สำหรับแต่ละโค้ด
	for i := range discountCodes {
		var currentUses int64
		// เปลี่ยน condition ให้รองรับทั้ง paid, confirmed และ completed
		dc.DB.Model(&models.Booking{}).
			Where("discount_code_id = ? AND payment_status IN (?)", discountCodes[i].ID, []string{"paid", "confirmed", "completed"}).
			Count(&currentUses)
		discountCodes[i].CurrentUses = int(currentUses)
		
		// Debug log - เพิ่มการดู bookings ที่ใช้โค้ดนี้
		var debugBookings []models.Booking
		dc.DB.Where("discount_code_id = ?", discountCodes[i].ID).Find(&debugBookings)
		fmt.Printf("🔍 Discount Code %s (ID: %s):\n", discountCodes[i].Code, discountCodes[i].ID)
		fmt.Printf("   - Total bookings with this code: %d\n", len(debugBookings))
		for _, booking := range debugBookings {
			fmt.Printf("   - Booking ID: %s, Payment Status: %s\n", booking.ID, booking.PaymentStatus)
		}
		fmt.Printf("   - Calculated current_uses: %d\n", currentUses)
	}

	c.JSON(200, discountCodes)
}

// ValidateDiscountCode - ตรวจสอบโค้ดก่อนใช้ (รองรับทั้ง advertiser และ global codes)
func (dc *DiscountCodeController) ValidateDiscountCode(c *gin.Context) {
	var req struct {
		Code      string  `json:"code" binding:"required"`
		PackageID *string `json:"package_id"` // ตรวจสอบว่า advertiser โฆษณาแพคเกจนี้หรือไม่
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// ตรวจสอบ advertiser code ก่อน
	var discountCode models.DiscountCode
	if err := dc.DB.Where("code = ?", req.Code).First(&discountCode).Error; err == nil {
		// เจอ advertiser code
		if !discountCode.IsValidForUse() {
			c.JSON(400, gin.H{"error": "Discount code is inactive"})
			return
		}

		// ตรวจสอบว่า advertiser โฆษณาแพคเกจนี้หรือไม่
		if req.PackageID != nil {
			packageID, err := uuid.Parse(*req.PackageID)
			if err != nil {
				c.JSON(400, gin.H{"error": "Invalid package ID"})
				return
			}

			var count int64
			dc.DB.Table("package_advertisers").
				Where("travel_package_id = ? AND advertiser_id = ?", packageID, discountCode.AdvertiserID).
				Count(&count)
			
			if count == 0 {
				c.JSON(400, gin.H{"error": "This advertiser code is not valid for this package"})
				return
			}
		}

		c.JSON(200, gin.H{
			"valid":          true,
			"type":           "advertiser",
			"discount_value": discountCode.DiscountValue,
			"discount_type":  discountCode.DiscountType,
			"discount_code_id": discountCode.ID,
			"advertiser_id":  discountCode.AdvertiserID,
		})
		return
	}

	// ตรวจสอบ global code
	var globalCode models.GlobalDiscountCode
	if err := dc.DB.Where("code = ?", req.Code).First(&globalCode).Error; err == nil {
		if !globalCode.IsValidForUse() {
			c.JSON(400, gin.H{"error": "Global discount code is inactive"})
			return
		}

		c.JSON(200, gin.H{
			"valid":          true,
			"type":          "global",
			"discount_value": globalCode.DiscountValue,
			"discount_type":  globalCode.DiscountType,
			"global_code_id": globalCode.ID,
		})
		return
	}

	c.JSON(404, gin.H{"error": "Invalid discount code"})
}

// UseDiscountCode - ใช้โค้ดส่วนลด (เรียกจาก booking)
func (dc *DiscountCodeController) UseDiscountCode(c *gin.Context) {
	var req struct {
		DiscountCodeID *string `json:"discount_code_id"`
		GlobalCodeID   *string `json:"global_code_id"`
		BookingID      string  `json:"booking_id" binding:"required"`
		OriginalAmount float64 `json:"original_amount" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// เริ่ม transaction
	tx := dc.DB.Begin()

	var discountAmount float64
	var advertiserID *uuid.UUID

	if req.DiscountCodeID != nil {
		// ใช้ advertiser code
		var discountCode models.DiscountCode
		if err := tx.Where("id = ?", *req.DiscountCodeID).First(&discountCode).Error; err != nil {
			tx.Rollback()
			c.JSON(404, gin.H{"error": "Discount code not found"})
			return
		}
		
		// คำนวณส่วนลดตาม type
		if discountCode.DiscountType == "percentage" {
			discountAmount = req.OriginalAmount * (discountCode.DiscountValue / 100)
		} else { // fixed
			discountAmount = discountCode.DiscountValue
		}
		advertiserID = &discountCode.AdvertiserID
	} else if req.GlobalCodeID != nil {
		// ใช้ global code
		var globalCode models.GlobalDiscountCode
		if err := tx.Where("id = ?", *req.GlobalCodeID).First(&globalCode).Error; err != nil {
			tx.Rollback()
			c.JSON(404, gin.H{"error": "Global discount code not found"})
			return
		}
		if globalCode.DiscountType == "percentage" {
			discountAmount = req.OriginalAmount * (globalCode.DiscountValue / 100)
		} else { // fixed
			discountAmount = globalCode.DiscountValue
		}
	} else {
		tx.Rollback()
		c.JSON(400, gin.H{"error": "Either discount_code_id or global_code_id is required"})
		return
	}
	finalAmount := req.OriginalAmount - discountAmount

	// อัปเดต booking ด้วยข้อมูลส่วนลด
	bookingID, _ := uuid.Parse(req.BookingID)
	
	updateData := map[string]interface{}{
		"discount_amount": discountAmount,
		"final_amount":    finalAmount,
	}
	
	if req.DiscountCodeID != nil {
		discountCodeID, _ := uuid.Parse(*req.DiscountCodeID)
		updateData["discount_code_id"] = discountCodeID
	}
	
	if err := tx.Model(&models.Booking{}).Where("id = ?", bookingID).Updates(updateData).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to update booking"})
		return
	}

	// สร้างค่าคอมมิชชั่นเฉพาะ advertiser code
	if advertiserID != nil {
		dc.CreateCommission(tx, *advertiserID, bookingID, finalAmount, req.DiscountCodeID)
	}

	tx.Commit()

	c.JSON(200, gin.H{
		"discount_amount": discountAmount,
		"final_amount":   finalAmount,
	})
}

// CreateCommission - สร้างค่าคอมมิชชั่น (ใช้ commission rate จากโค้ดส่วนลด)
func (dc *DiscountCodeController) CreateCommission(tx *gorm.DB, advertiserID uuid.UUID, bookingID uuid.UUID, finalAmount float64, discountCodeID *string) {
	// ดึงข้อมูล discount code เพื่อใช้ commission rate
	var discountCode models.DiscountCode
	commissionRate := 5.0 // default rate
	
	if discountCodeID != nil {
		if err := tx.Where("id = ?", *discountCodeID).First(&discountCode).Error; err == nil {
			commissionRate = discountCode.CommissionRate
		}
	}
	
	commissionAmount := finalAmount * (commissionRate / 100)
	
	// สร้าง commission ใหม่
	commission := models.Commission{
		ID:                   uuid.New(),
		BookingID:            bookingID,
		AdvertiserID:         advertiserID,
		CommissionAmount:     commissionAmount,
		CommissionPercentage: commissionRate,
		Status:               "pending",
	}
	
	// เพิ่ม DiscountCodeID ถ้ามี
	if discountCodeID != nil {
		discountCodeUUID, _ := uuid.Parse(*discountCodeID)
		commission.DiscountCodeID = &discountCodeUUID
	}
	
	tx.Create(&commission)
}

// DiscountCommissionData โครงสร้างข้อมูลค่าคอมมิชชั่นจากโค้ดส่วนลด
type DiscountCommissionData struct {
	PackageID        string  `json:"package_id"`
	PackageName      string  `json:"package_name"`
	TotalRevenue     float64 `json:"total_revenue"`
	DiscountCodeID   string  `json:"discount_code_id"`
	DiscountCode     string  `json:"discount_code"`
	UsagePercentage  float64 `json:"usage_percentage"`
	CommissionRate   float64 `json:"commission_rate"`
	CommissionAmount float64 `json:"commission_amount"`
}

// GetCommissionsByAdvertiser - ดูค่าคอมมิชชั่นจากโค้ดส่วนลด
func (dc *DiscountCodeController) GetCommissionsByAdvertiser(c *gin.Context) {
	advertiserID := c.Param("advertiser_id")
	
	// รับ query parameters สำหรับเดือน/ปี (ใช้เดือนปัจจุบันเป็น default)
	monthStr := c.DefaultQuery("month", fmt.Sprintf("%d", time.Now().Month()))
	yearStr := c.DefaultQuery("year", fmt.Sprintf("%d", time.Now().Year()))
	
	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		c.JSON(400, gin.H{"error": "Invalid month parameter"})
		return
	}
	
	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2020 || year > 2030 {
		c.JSON(400, gin.H{"error": "Invalid year parameter"})
		return
	}
	
	// สร้างช่วงวันที่สำหรับเดือนที่เลือก
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)
	
	// ดึงข้อมูล commissions ที่มีอยู่แล้วในระบบสำหรับ advertiser นี้
	var commissions []models.Commission
	if err := dc.DB.Where("advertiser_id = ? AND created_at >= ? AND created_at <= ?", 
		advertiserID, startDate, endDate).
		Find(&commissions).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch commissions", "details": err.Error()})
		return
	}
	
	// จัดกลุ่มค่าคอมมิชชั่นตาม discount code
	packageRevenue := make(map[string]*DiscountCommissionData)
	
	for _, commission := range commissions {
		if commission.DiscountCodeID == nil {
			continue // ข้าม commission ที่ไม่ได้มาจาก discount code
		}
		
		discountCodeIDStr := commission.DiscountCodeID.String()
		
		if packageRevenue[discountCodeIDStr] == nil {
			// ดึงข้อมูล discount code
			var discountCode models.DiscountCode
			if err := dc.DB.Preload("Package").First(&discountCode, *commission.DiscountCodeID).Error; err != nil {
				continue
			}
			
			// คำนวณ usage percentage
			var currentUses int64
			dc.DB.Model(&models.Booking{}).
				Where("discount_code_id = ? AND payment_status IN (?)", discountCode.ID, []string{"paid", "confirmed", "completed"}).
				Count(&currentUses)
			
			usagePercentage := float64(0)
			maxUses := 1 // default
			if discountCode.MaxUses != nil {
				maxUses = *discountCode.MaxUses
				if maxUses > 0 {
					usagePercentage = (float64(currentUses) / float64(maxUses)) * 100
				}
			}
			
			// คำนวณ commission rate ตาม usage percentage
			commissionRate := float64(0)
			if usagePercentage >= 50 && usagePercentage < 75 {
				commissionRate = 3
			} else if usagePercentage >= 75 && usagePercentage < 100 {
				commissionRate = 5
			} else if usagePercentage >= 100 {
				commissionRate = 10
			}
			
			packageName := "ไม่พบแพ็กเกจ"
			packageID := discountCode.PackageID.String()
			if discountCode.Package.Title != "" {
				packageName = discountCode.Package.Title
			}
			
			packageRevenue[discountCodeIDStr] = &DiscountCommissionData{
				PackageID:        packageID,
				PackageName:      packageName,
				TotalRevenue:     0,
				DiscountCodeID:   discountCode.ID.String(),
				DiscountCode:     discountCode.Code,
				UsagePercentage:  usagePercentage,
				CommissionRate:   commissionRate,
				CommissionAmount: 0,
			}
		}
		
		packageRevenue[discountCodeIDStr].CommissionAmount += commission.CommissionAmount
	}
	
	// แปลงเป็น array สำหรับ response
	var result []DiscountCommissionData
	for _, pkg := range packageRevenue {
		result = append(result, *pkg)
	}
	
	c.JSON(200, result)
}

// GetAllAdvertisers - ดู advertisers ทั้งหมดสำหรับ Manager
func (dc *DiscountCodeController) GetAllAdvertisers(c *gin.Context) {
	var advertisers []models.User
	if err := dc.DB.Joins("JOIN public.user_roles ON auth.users.id = public.user_roles.user_id").
		Where("public.user_roles.role = ?", "advertiser").
		Preload("Profile").
		Find(&advertisers).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch advertisers"})
		return
	}

	var result []gin.H
	for _, advertiser := range advertisers {
		advertiserName := advertiser.Email
		if advertiser.Profile != nil && advertiser.Profile.DisplayName != "" {
			advertiserName = advertiser.Profile.DisplayName
		}
		
		result = append(result, gin.H{
			"id":           advertiser.ID,
			"email":        advertiser.Email,
			"display_name": advertiserName,
		})
	}

	c.JSON(200, result)
}

// GetAllPackages - ดู packages ทั้งหมดสำหรับ Manager เลือกตอนสร้างโค้ดส่วนลด
func (dc *DiscountCodeController) GetAllPackages(c *gin.Context) {
	var packages []models.TravelPackage
	if err := dc.DB.Where("is_active = ?", true).Find(&packages).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch packages"})
		return
	}

	var result []gin.H
	for _, pkg := range packages {
		result = append(result, gin.H{
			"id":       pkg.ID,
			"title":    pkg.Title,
			"location": pkg.Location,
			"price":    pkg.Price,
		})
	}

	c.JSON(200, result)
}

// DeleteDiscountCode - ลบโค้ดส่วนลด Advertiser
func (dc *DiscountCodeController) DeleteDiscountCode(c *gin.Context) {
	codeID := c.Param("id")
	
	// ตรวจสอบว่าโค้ดมีอยู่หรือไม่
	var discountCode models.DiscountCode
	if err := dc.DB.First(&discountCode, "id = ?", codeID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Discount code not found"})
		return
	}

	// ลบโค้ดส่วนลด
	if err := dc.DB.Delete(&discountCode).Error; err != nil {
		fmt.Printf("Error deleting discount code: %v\n", err)
		c.JSON(500, gin.H{
			"error": "Failed to delete discount code",
			"details": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{"message": "Discount code deleted successfully"})
}

// DeleteGlobalDiscountCode - ลบโค้ดส่วนลด Global
func (dc *DiscountCodeController) DeleteGlobalDiscountCode(c *gin.Context) {
	codeID := c.Param("id")
	
	// ตรวจสอบว่าโค้ดมีอยู่หรือไม่
	var globalCode models.GlobalDiscountCode
	if err := dc.DB.First(&globalCode, "id = ?", codeID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Global discount code not found"})
		return
	}

	// ลบโค้ดส่วนลด
	if err := dc.DB.Delete(&globalCode).Error; err != nil {
		fmt.Printf("Error deleting global discount code: %v\n", err)
		c.JSON(500, gin.H{
			"error": "Failed to delete global discount code",
			"details": err.Error(),
		})
		return
	}

	c.JSON(200, gin.H{"message": "Global discount code deleted successfully"})
}