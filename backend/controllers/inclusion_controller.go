package controllers

import (
	"strings"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GET /api/inclusions - ดึงรายการ inclusions ทั้งหมด
func GetAllInclusionsHandler(c *gin.Context, db *gorm.DB) {
	var inclusions []models.InclusionType
	
	if err := db.Where("is_active = ?", true).
		Order("display_order ASC, name ASC").
		Find(&inclusions).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(200, inclusions)
}

// POST /api/inclusions - สร้าง inclusion ใหม่
func CreateInclusionHandler(c *gin.Context, db *gorm.DB) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		NameTh      string `json:"name_th"`
		NameEn      string `json:"name_en"`
		Description string `json:"description"`
		Category    string `json:"category"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	// เช็คว่ามีอยู่แล้วหรือไม่
	var existing models.InclusionType
	if err := db.Where("LOWER(name) = LOWER(?)", strings.TrimSpace(req.Name)).
		First(&existing).Error; err == nil {
		// มีอยู่แล้ว ส่งกลับไป
		c.JSON(200, existing)
		return
	}
	
	// สร้างใหม่
	inclusion := models.InclusionType{
		Name:        strings.TrimSpace(req.Name),
		NameTh:      req.NameTh,
		NameEn:      req.NameEn,
		Description: req.Description,
		Category:    req.Category,
		IsActive:    true,
	}
	
	if err := db.Create(&inclusion).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(201, inclusion)
}

// GET /api/packages/:id/inclusions - ดึง inclusions ของแพคเกจ
func GetPackageInclusionsHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID"})
		return
	}
	
	// เช็คว่า package มีอยู่
	var pkg models.TravelPackage
	if err := db.First(&pkg, "id = ?", packageUUID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ดึง inclusions ผ่าน many-to-many table
	var inclusions []models.InclusionType
	err = db.Table("inclusion_types").
		Select("inclusion_types.*").
		Joins("JOIN package_inclusions ON package_inclusions.inclusion_id = inclusion_types.id").
		Where("package_inclusions.package_id = ? AND package_inclusions.is_included = ?", packageUUID, true).
		Order("inclusion_types.display_order ASC, inclusion_types.name ASC").
		Find(&inclusions).Error
	
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(200, inclusions)
}

// PUT /api/packages/:id/inclusions - อัพเดท inclusions ของแพคเกจ
func UpdatePackageInclusionsHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID"})
		return
	}
	
	var req struct {
		InclusionIDs []string `json:"inclusion_ids"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	// เช็คว่า package มีอยู่
	var pkg models.TravelPackage
	if err := db.First(&pkg, "id = ?", packageUUID).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ลบ inclusions เดิมทั้งหมด
	if err := db.Where("package_id = ?", packageUUID).
		Delete(&models.PackageInclusion{}).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to clear inclusions"})
		return
	}
	
	// เพิ่ม inclusions ใหม่
	for _, inclusionID := range req.InclusionIDs {
		inclusionUUID, err := uuid.Parse(inclusionID)
		if err != nil {
			continue
		}
		
		db.Create(&models.PackageInclusion{
			PackageID:   packageUUID,
			InclusionID: inclusionUUID,
			IsIncluded:  true,
		})
	}
	
	c.JSON(200, gin.H{"message": "Inclusions updated successfully"})
}
