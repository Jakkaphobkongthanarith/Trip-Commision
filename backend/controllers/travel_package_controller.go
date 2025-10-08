package controllers

import (
	"strings"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	// "c:\\Users\\User\\Desktop\\Project Real\\trip-trader\\backend\\models"
	"gorm.io/gorm"
)

// Helper function เพื่อแปลง tags จาก string เป็น array
func convertTagsToArray(pkg *models.TravelPackage) {
	if pkg.Tags != "" {
		// ลบ { และ } ออกจาก string
		cleanedTags := strings.ReplaceAll(pkg.Tags, "{", "")
		cleanedTags = strings.ReplaceAll(cleanedTags, "}", "")
		
		// แปลง string เป็น array โดยแยกด้วย comma
		tags := strings.Split(cleanedTags, ",")
		
		// Trim whitespace และเอาค่าว่างออก
		var cleanTags []string
		for _, tag := range tags {
			trimmed := strings.TrimSpace(tag)
			if trimmed != "" {
				cleanTags = append(cleanTags, trimmed)
			}
		}
		pkg.TagsArray = cleanTags
	} else {
		pkg.TagsArray = []string{}
	}
}

// Helper function เพื่อแปลง packages ทั้งหมด
func convertAllPackagesTags(packages []models.TravelPackage) []models.TravelPackage {
	for i := range packages {
		convertTagsToArray(&packages[i])
	}
	return packages
}

// ดึง travel packages ทั้งหมดพร้อมข้อมูล advertiser
func GetAllPackagesHandler(c *gin.Context, db *gorm.DB) {
	var packages []models.TravelPackage
	println("Fetching all packages with advertiser")
	
	// ใช้ GORM Find พร้อม Preload ข้อมูล Advertiser (single relationship)
	result := db.Preload("Advertiser").Find(&packages)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	// แปลง tags เป็น array ก่อนส่งกลับ
	packages = convertAllPackagesTags(packages)
	
	c.JSON(200, packages)
}

// ดึง travel package โดย ID - แสดงเป็น packageList ที่ filter ด้วย packageId
func GetPackageByIDHandler(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var pkg models.TravelPackage
	
	// Debug log
	println("Searching for package with ID:", id)
	
	result := db.Where("id = ?", id).First(&pkg)
	if result.Error != nil {
		println("Error:", result.Error.Error())
		c.JSON(404, gin.H{
			"error": "Package not found", 
			"id": id,
			"sql_error": result.Error.Error(),
		})
		return
	}
	
	// แปลง tags เป็น array ก่อนส่งกลับ
	convertTagsToArray(&pkg)
	
	// ส่งกลับเป็น object เดียว (ตามเดิม)
	c.JSON(200, pkg)
}

// สร้าง travel package ใหม่
func CreatePackageHandler(c *gin.Context, db *gorm.DB) {
	var pkg models.TravelPackage
	if err := c.ShouldBindJSON(&pkg); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	// สร้าง record ใหม่ (GORM Create)
	result := db.Create(&pkg)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(200, pkg)
}

// อัพเดต current_bookings เมื่อมีการจองสำเร็จ
func UpdateCurrentBookingsHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	type BookingUpdate struct {
		GuestCount int `json:"guest_count"`
	}
	
	var updateData BookingUpdate
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	
	// อัพเดต current_bookings โดยเพิ่มจำนวนผู้โดยสาร
	result := db.Model(&models.TravelPackage{}).
		Where("id = ?", packageID).
		Update("current_bookings", gorm.Expr("current_bookings + ?", updateData.GuestCount))
	
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	if result.RowsAffected == 0 {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ส่งข้อมูลแพคเกจที่อัพเดตแล้วกลับไป
	var updatedPkg models.TravelPackage
	db.Where("id = ?", packageID).First(&updatedPkg)
	
	c.JSON(200, gin.H{
		"message": "Current bookings updated successfully",
		"package": updatedPkg,
	})
}

// ดึงรายชื่อผู้จองที่ยืนยันแล้วสำหรับแพคเกจ
func GetPackageConfirmedUsersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("packageId")
	
	// ดึงข้อมูลการจองที่มี status = confirmed สำหรับแพคเกจนี้
	var bookings []models.Booking
	result := db.Where("package_id = ? AND status = ?", packageID, "confirmed").
		Preload("TravelPackages").  // โหลดข้อมูลแพคเกจ
		Preload("Profile").         // โหลดข้อมูลโปรไฟล์ผู้จอง (แก้ไขชื่อให้ตรงกับ model)
		Find(&bookings)
	
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	c.JSON(200, bookings)
}



// อัพเดต package-advertiser relationships
func UpdatePackageAdvertisersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	type AdvertiserUpdate struct {
		AdvertiserIds []string `json:"advertiser_ids"`
	}
	
	var updateData AdvertiserUpdate
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	
	// หา package ก่อน
	var pkg models.TravelPackage
	if err := db.Where("id = ?", packageID).First(&pkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// อัปเดต advertiser_id ใน travel_packages table
	var advertiserID *uuid.UUID
	if len(updateData.AdvertiserIds) > 0 {
		advertiserUUID, err := uuid.Parse(updateData.AdvertiserIds[0])
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid advertiser ID format"})
			return
		}
		advertiserID = &advertiserUUID
	}
	
	if err := db.Model(&pkg).Update("advertiser_id", advertiserID).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update advertiser"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Package advertiser updated successfully"})
}

// ดึงรายชื่อ advertiser ของ package (แปลงเป็น single advertiser)
func GetPackageAdvertisersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	// Convert packageID string to UUID
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	// ใช้ GORM association เพื่อดึง advertiser เดี่ยว
	var pkg models.TravelPackage
	if err := db.Where("id = ?", packageUUID).Preload("Advertiser").First(&pkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ส่งกลับเป็น array สำหรับ backward compatibility กับ frontend
	if pkg.Advertiser != nil {
		c.JSON(200, []models.User{*pkg.Advertiser})
	} else {
		c.JSON(200, []models.User{})
	}
}

// ลบ travel package (พร้อมกับ relationships)
func DeletePackageHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	// Convert packageID string to UUID
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	// ลบ package-advertiser relationships ก่อน
	if err := db.Where("package_id = ?", packageUUID).Delete(&models.PackageAdvertiser{}).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to delete package relationships"})
		return
	}
	
	// ลบ package
	result := db.Where("id = ?", packageUUID).Delete(&models.TravelPackage{})
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	if result.RowsAffected == 0 {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Package deleted successfully"})
}


// Service สำหรับดึง travel packages ทั้งหมด
func GetAllTravelPackages(db *gorm.DB) ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	return packages, result.Error
}