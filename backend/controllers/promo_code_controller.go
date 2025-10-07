package controllers

import (
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

// GetAllDiscountCodes - Manager ดู discount codes ทั้งหมด
func (dc *DiscountCodeController) GetAllDiscountCodes(c *gin.Context) {
	var discountCodes []models.DiscountCode
	if err := dc.DB.Preload("Advertiser").Preload("Package").Find(&discountCodes).Error; err != nil {
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
		
		packageName := "ทุกแพคเกจ"
		if code.Package != nil {
			packageName = code.Package.Title
		}
		
		result = append(result, gin.H{
			"id":                  code.ID,
			"code":               code.Code,
			"advertiser_id":      code.AdvertiserID,
			"advertiser_name":    advertiserName,
			"package_id":         code.PackageID,
			"package_name":       packageName,
			"discount_percentage": code.DiscountPercentage,
			"is_active":         code.IsActive,
			"created_at":        code.CreatedAt,
		})
	}

	c.JSON(200, result)
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

// CreateDiscountCode - Manager สร้างโค้ดส่วนลด
func (dc *DiscountCodeController) CreateDiscountCode(c *gin.Context) {
	var req struct {
		PackageID          *string `json:"package_id"` // null = ทุกแพคเกจ
		DiscountPercentage float64 `json:"discount_percentage" binding:"required,min=1,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// ดึงข้อมูลแพคเกจ
	var packageTitle string = "ALL"
	var packageID *uuid.UUID = nil
	
	if req.PackageID != nil && *req.PackageID != "" {
		parsedID, err := uuid.Parse(*req.PackageID)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid package ID"})
			return
		}
		
		var pkg models.TravelPackage
		if err := dc.DB.First(&pkg, parsedID).Error; err != nil {
			c.JSON(404, gin.H{"error": "Package not found"})
			return
		}
		
		packageTitle = pkg.Title
		packageID = &parsedID
	}

	// ดึงรายชื่อ advertisers
	var advertisers []models.User
	if err := dc.DB.Joins("JOIN public.user_roles ON auth.users.id = public.user_roles.user_id").
		Where("public.user_roles.role = ?", "advertiser").
		Find(&advertisers).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch advertisers"})
		return
	}

	// สร้างโค้ดให้แต่ละ advertiser
	var createdCodes []models.DiscountCode
	for _, advertiser := range advertisers {
		// สร้างโค้ดอัตโนมัติ
		code := models.GenerateDiscountCode(packageTitle, req.DiscountPercentage)
		
		// ตรวจสอบว่าโค้ดซ้ำหรือไม่ (ถ้าซ้ำ ให้สร้างใหม่)
		for {
			var existingCode models.DiscountCode
			if err := dc.DB.Where("code = ?", code).First(&existingCode).Error; err != nil {
				break // ไม่เจอโค้ดซ้ำ
			}
			// เจอโค้ดซ้ำ สร้างใหม่
			code = models.GenerateDiscountCode(packageTitle, req.DiscountPercentage)
		}
		
		discountCode := models.DiscountCode{
			ID:                 uuid.New(),
			Code:               code,
			PackageID:          packageID,
			AdvertiserID:       advertiser.ID,
			DiscountPercentage: req.DiscountPercentage,
			IsActive:           true,
		}

		if err := dc.DB.Create(&discountCode).Error; err == nil {
			createdCodes = append(createdCodes, discountCode)
		}
	}

	c.JSON(201, gin.H{
		"message": "Discount codes created successfully",
		"count":   len(createdCodes),
		"codes":   createdCodes,
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

	var result []gin.H
	for _, code := range discountCodes {
		packageName := "ทุกแพคเกจ"
		if code.Package != nil {
			packageName = code.Package.Title
		}
		
		result = append(result, gin.H{
			"id":                  code.ID,
			"code":               code.Code,
			"package_name":       packageName,
			"discount_percentage": code.DiscountPercentage,
			"is_active":         code.IsActive,
			"created_at":        code.CreatedAt,
		})
	}

	c.JSON(200, result)
}

// ValidateDiscountCode - ตรวจสอบโค้ดก่อนใช้
func (dc *DiscountCodeController) ValidateDiscountCode(c *gin.Context) {
	var req struct {
		Code      string  `json:"code" binding:"required"`
		PackageID *string `json:"package_id"` // ตรวจสอบว่าโค้ดใช้กับแพคเกจนี้ได้หรือไม่
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var discountCode models.DiscountCode
	if err := dc.DB.Where("code = ?", req.Code).First(&discountCode).Error; err != nil {
		c.JSON(404, gin.H{"error": "Invalid discount code"})
		return
	}

	// ตรวจสอบความถูกต้อง
	if !discountCode.IsValidForUse() {
		c.JSON(400, gin.H{"error": "Discount code is inactive"})
		return
	}

	// ตรวจสอบแพคเกจ
	if discountCode.PackageID != nil {
		if req.PackageID == nil {
			c.JSON(400, gin.H{"error": "Package ID required for this discount code"})
			return
		}
		
		packageID, err := uuid.Parse(*req.PackageID)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid package ID"})
			return
		}
		
		if *discountCode.PackageID != packageID {
			c.JSON(400, gin.H{"error": "Discount code not valid for this package"})
			return
		}
	}

	c.JSON(200, gin.H{
		"valid":               true,
		"discount_percentage": discountCode.DiscountPercentage,
		"discount_code_id":   discountCode.ID,
		"advertiser_id":      discountCode.AdvertiserID,
	})
}

// UseDiscountCode - ใช้โค้ดส่วนลด (เรียกจาก booking)
func (dc *DiscountCodeController) UseDiscountCode(c *gin.Context) {
	var req struct {
		DiscountCodeID string  `json:"discount_code_id" binding:"required"`
		BookingID      string  `json:"booking_id" binding:"required"`
		OriginalAmount float64 `json:"original_amount" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// เริ่ม transaction
	tx := dc.DB.Begin()

	// ดึงข้อมูลโค้ด
	var discountCode models.DiscountCode
	if err := tx.Where("id = ?", req.DiscountCodeID).First(&discountCode).Error; err != nil {
		tx.Rollback()
		c.JSON(404, gin.H{"error": "Discount code not found"})
		return
	}

	// คำนวณส่วนลด
	discountAmount := req.OriginalAmount * (discountCode.DiscountPercentage / 100)
	finalAmount := req.OriginalAmount - discountAmount

	// อัปเดต booking ด้วยข้อมูลส่วนลด
	bookingID, _ := uuid.Parse(req.BookingID)
	discountCodeID, _ := uuid.Parse(req.DiscountCodeID)
	
	if err := tx.Model(&models.Booking{}).Where("id = ?", bookingID).Updates(map[string]interface{}{
		"discount_code_id": discountCodeID,
		"discount_amount":  discountAmount,
		"final_amount":     finalAmount,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to update booking"})
		return
	}

	// สร้างค่าคอมมิชชั่นถ้าโค้ดไม่ใช่แพคเกจทั้งหมด
	if discountCode.PackageID != nil {
		dc.CreateCommission(tx, &discountCode, bookingID, finalAmount)
	}

	tx.Commit()

	c.JSON(200, gin.H{
		"discount_amount": discountAmount,
		"final_amount":   finalAmount,
	})
}

// CreateCommission - สร้างค่าคอมมิชชั่น
func (dc *DiscountCodeController) CreateCommission(tx *gorm.DB, discountCode *models.DiscountCode, bookingID uuid.UUID, finalAmount float64) {
	// ค่าคอมมิชชั่นคงที่ 5%
	commissionRate := 5.0
	commissionAmount := finalAmount * (commissionRate / 100)
	
	// สร้าง commission ใหม่
	commission := models.Commission{
		ID:                   uuid.New(),
		AdvertiserID:         discountCode.AdvertiserID,
		BookingID:            bookingID,
		DiscountCodeID:       &discountCode.ID,
		CommissionAmount:     commissionAmount,
		CommissionPercentage: commissionRate,
		Status:               "pending",
	}
	tx.Create(&commission)
}

// GetCommissionsByAdvertiser - ดูค่าคอมมิชชั่น
func (dc *DiscountCodeController) GetCommissionsByAdvertiser(c *gin.Context) {
	advertiserID := c.Param("advertiser_id")

	var commissions []models.Commission
	if err := dc.DB.Where("advertiser_id = ?", advertiserID).
		Preload("Advertiser").
		Preload("Booking").
		Preload("DiscountCode").
		Order("created_at DESC").
		Find(&commissions).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch commissions"})
		return
	}

	c.JSON(200, commissions)
}

// GetAllPackages - ดูแพคเกจทั้งหมดสำหรับ Manager
func (dc *DiscountCodeController) GetAllPackages(c *gin.Context) {
	var packages []models.TravelPackage
	if err := dc.DB.Find(&packages).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch packages"})
		return
	}

	c.JSON(200, packages)
}