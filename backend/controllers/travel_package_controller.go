package controllers

import (
	"strings"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"

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

// ดึง travel packages ทั้งหมด
func GetAllPackagesHandler(c *gin.Context, db *gorm.DB) {
	var packages []models.TravelPackage
	println("Fetching all packages")
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	// แปลง tags เป็น array ก่อนส่งกลับ
	packages = convertAllPackagesTags(packages)
	
	c.JSON(200, packages)
}

// ดึง travel package โดย ID
func GetPackageByIDHandler(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var pkg models.TravelPackage
	println("cat")
	
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



// Service สำหรับดึง travel packages ทั้งหมด
func GetAllTravelPackages(db *gorm.DB) ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	return packages, result.Error
}