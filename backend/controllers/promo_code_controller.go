package controllers

import (
	"fmt"
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
			"id":                  code.ID,
			"code":               code.Code,
			"advertiser_id":      code.AdvertiserID,
			"advertiser_name":    advertiserName,
			"discount_percentage": code.DiscountPercentage,
			"is_active":         code.IsActive,
			"created_at":        code.CreatedAt,
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

// CreateDiscountCodeForAdvertiser - Manager สร้างโค้ดส่วนลดให้ Advertiser คนเดียว
func (dc *DiscountCodeController) CreateDiscountCodeForAdvertiser(c *gin.Context) {
	var req struct {
		AdvertiserID       string  `json:"advertiser_id" binding:"required"`
		DiscountPercentage float64 `json:"discount_percentage" binding:"required,min=1,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// ดึงข้อมูล advertiser
	advertiserID, err := uuid.Parse(req.AdvertiserID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid advertiser ID"})
		return
	}

	var advertiser models.User
	if err := dc.DB.Preload("Profile").First(&advertiser, advertiserID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Advertiser not found"})
		return
	}

	// สร้างโค้ดอัตโนมัติ
	advertiserName := advertiser.Email
	if advertiser.Profile != nil && advertiser.Profile.DisplayName != "" {
		advertiserName = advertiser.Profile.DisplayName
	}

	code := models.GenerateDiscountCode(advertiserName, req.DiscountPercentage)
	
	// ตรวจสอบว่าโค้ดซ้ำหรือไม่
	for {
		var existingCode models.DiscountCode
		if err := dc.DB.Where("code = ?", code).First(&existingCode).Error; err != nil {
			break // ไม่เจอโค้ดซ้ำ
		}
		code = models.GenerateDiscountCode(advertiserName, req.DiscountPercentage)
	}
	
	discountCode := models.DiscountCode{
		ID:                 uuid.New(),
		Code:               code,
		AdvertiserID:       advertiserID,
		DiscountPercentage: req.DiscountPercentage,
		IsActive:           &[]bool{true}[0], // แก้เป็น pointer
	}

	if err := dc.DB.Create(&discountCode).Error; err != nil {
		fmt.Printf("Error creating advertiser discount code: %v\n", err)
		c.JSON(500, gin.H{
			"error": "Failed to create discount code",
			"details": err.Error(),
		})
		return
	}

	c.JSON(201, gin.H{
		"message": "Discount code created successfully",
		"code":    discountCode,
	})
}

// CreateGlobalDiscountCode - Manager สร้างโค้ดส่วนลดสำหรับผู้ใช้ทั่วไป
func (dc *DiscountCodeController) CreateGlobalDiscountCode(c *gin.Context) {
	var req struct {
		DiscountPercentage float64 `json:"discount_percentage" binding:"required,min=1,max=50"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// สร้างโค้ดอัตโนมัติ
	code := models.GenerateGlobalDiscountCode(req.DiscountPercentage)
	
	// ตรวจสอบว่าโค้ดซ้ำหรือไม่
	for {
		var existingCode models.GlobalDiscountCode
		if err := dc.DB.Where("code = ?", code).First(&existingCode).Error; err != nil {
			break // ไม่เจอโค้ดซ้ำ
		}
		code = models.GenerateGlobalDiscountCode(req.DiscountPercentage)
	}
	
	globalCode := models.GlobalDiscountCode{
		ID:                 uuid.New(),
		Code:               code,
		DiscountPercentage: req.DiscountPercentage,
		IsActive:           true,
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
		Find(&discountCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch discount codes"})
		return
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
				Where("package_id = ? AND advertiser_id = ?", packageID, discountCode.AdvertiserID).
				Count(&count)
			
			if count == 0 {
				c.JSON(400, gin.H{"error": "This advertiser code is not valid for this package"})
				return
			}
		}

		c.JSON(200, gin.H{
			"valid":               true,
			"type":               "advertiser",
			"discount_percentage": discountCode.DiscountPercentage,
			"discount_code_id":   discountCode.ID,
			"advertiser_id":      discountCode.AdvertiserID,
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
			"valid":               true,
			"type":               "global",
			"discount_percentage": globalCode.DiscountPercentage,
			"global_code_id":     globalCode.ID,
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

	var discountPercentage float64
	var advertiserID *uuid.UUID

	if req.DiscountCodeID != nil {
		// ใช้ advertiser code
		var discountCode models.DiscountCode
		if err := tx.Where("id = ?", *req.DiscountCodeID).First(&discountCode).Error; err != nil {
			tx.Rollback()
			c.JSON(404, gin.H{"error": "Discount code not found"})
			return
		}
		discountPercentage = discountCode.DiscountPercentage
		advertiserID = &discountCode.AdvertiserID
	} else if req.GlobalCodeID != nil {
		// ใช้ global code
		var globalCode models.GlobalDiscountCode
		if err := tx.Where("id = ?", *req.GlobalCodeID).First(&globalCode).Error; err != nil {
			tx.Rollback()
			c.JSON(404, gin.H{"error": "Global discount code not found"})
			return
		}
		discountPercentage = globalCode.DiscountPercentage
	} else {
		tx.Rollback()
		c.JSON(400, gin.H{"error": "Either discount_code_id or global_code_id is required"})
		return
	}

	// คำนวณส่วนลด
	discountAmount := req.OriginalAmount * (discountPercentage / 100)
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

// CreateCommission - สร้างค่าคอมมิชชั่น (ปรับให้ตรงกับ schema ที่มีอยู่)
func (dc *DiscountCodeController) CreateCommission(tx *gorm.DB, advertiserID uuid.UUID, bookingID uuid.UUID, finalAmount float64, discountCodeID *string) {
	// ค่าคอมมิชชั่นคงที่ 5%
	commissionRate := 5.0
	commissionAmount := finalAmount * (commissionRate / 100)
	
	// สร้าง commission ใหม่ (ไม่ใช้ DiscountCodeID เพราะไม่มีใน schema)
	commission := models.Commission{
		ID:                   uuid.New(),
		BookingID:            bookingID,           // เรียงตาม schema
		AdvertiserID:         advertiserID,       // เรียงตาม schema
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