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
	println("Fetching all packages with advertisers")
	
	// ใช้ GORM Find พร้อม Preload ข้อมูล Advertisers (many-to-many relationship)
	result := db.Preload("Advertisers").Preload("Advertiser").Find(&packages)
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
	// ใช้ map[string]interface{} เพื่อรับข้อมูลที่ยืดหยุ่นกว่า
	var requestData map[string]interface{}
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	
	// สร้าง TravelPackage struct
	pkg := models.TravelPackage{}
	
	// Bind ข้อมูลแต่ละฟิลด์อย่างระมัดระวัง
	if title, ok := requestData["title"].(string); ok {
		pkg.Title = title
	}
	if description, ok := requestData["description"].(string); ok {
		pkg.Description = description
	}
	if location, ok := requestData["location"].(string); ok {
		pkg.Location = location
	}
	if imageURL, ok := requestData["image_url"].(string); ok {
		pkg.ImageURL = imageURL
	}
	if price, ok := requestData["price"].(float64); ok {
		pkg.Price = price
	}
	if duration, ok := requestData["duration"].(float64); ok {
		pkg.Duration = int(duration)
	}
	if maxGuests, ok := requestData["max_guests"].(float64); ok {
		pkg.MaxGuests = int(maxGuests)
	}
	if discountPercentage, ok := requestData["discount_percentage"].(float64); ok {
		pkg.DiscountPercentage = discountPercentage
	}
	
	// จัดการ dates
	if availableFrom, ok := requestData["available_from"].(string); ok && availableFrom != "" {
		pkg.AvailableFrom = &availableFrom
	}
	if availableTo, ok := requestData["available_to"].(string); ok && availableTo != "" {
		pkg.AvailableTo = &availableTo
	}
	
	// จัดการ tags (สำคัญ!)
	if tags, ok := requestData["tags"].(string); ok {
		pkg.Tags = tags  // เก็บ string format ใน DB
	}
	
	// สร้าง UUID สำหรับ package ใหม่
	pkg.ID = uuid.New()
	
	// สร้าง record ใหม่ (GORM Create)
	result := db.Create(&pkg)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	// แปลง tags เป็น array ก่อนส่งกลับ
	convertTagsToArray(&pkg)
	
	c.JSON(200, pkg)
}

// อัพเดต travel package
func UpdatePackageHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	// Convert packageID string to UUID
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	// ใช้ map[string]interface{} เพื่อรับข้อมูลที่ยืดหยุ่นกว่า
	var requestData map[string]interface{}
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	
	// หา package ที่ต้องการอัพเดต
	var existingPkg models.TravelPackage
	if err := db.Where("id = ?", packageUUID).First(&existingPkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// อัพเดตฟิลด์ที่ส่งมา
	updateData := make(map[string]interface{})
	
	if title, ok := requestData["title"].(string); ok {
		updateData["title"] = title
	}
	if description, ok := requestData["description"].(string); ok {
		updateData["description"] = description
	}
	if location, ok := requestData["location"].(string); ok {
		updateData["location"] = location
	}
	if imageURL, ok := requestData["image_url"].(string); ok {
		updateData["image_url"] = imageURL
	}
	if price, ok := requestData["price"].(float64); ok {
		updateData["price"] = price
	}
	if duration, ok := requestData["duration"].(float64); ok {
		updateData["duration"] = int(duration)
	}
	if maxGuests, ok := requestData["max_guests"].(float64); ok {
		updateData["max_guests"] = int(maxGuests)
	}
	if discountPercentage, ok := requestData["discount_percentage"].(float64); ok {
		updateData["discount_percentage"] = discountPercentage
	}
	
	// จัดการ dates
	if availableFrom, ok := requestData["available_from"].(string); ok {
		if availableFrom != "" {
			updateData["available_from"] = availableFrom
		} else {
			updateData["available_from"] = nil
		}
	}
	if availableTo, ok := requestData["available_to"].(string); ok {
		if availableTo != "" {
			updateData["available_to"] = availableTo
		} else {
			updateData["available_to"] = nil
		}
	}
	
	// จัดการ tags
	if tags, ok := requestData["tags"].(string); ok {
		updateData["tags"] = tags
	}

	// จัดการ advertiser_ids (multiple advertisers support)
	if advertiserIdsInterface, ok := requestData["advertiser_ids"]; ok {
		// Convert interface{} to []string
		if advertiserIdsSlice, ok := advertiserIdsInterface.([]interface{}); ok {
			var advertiserIds []string
			for _, id := range advertiserIdsSlice {
				if idStr, ok := id.(string); ok {
					advertiserIds = append(advertiserIds, idStr)
				}
			}
			
			// อัปเดต package-advertiser relationships
			if len(advertiserIds) > 0 {
				// ลบ relationships เก่าทั้งหมด
				if err := db.Where("travel_package_id = ?", packageUUID).Delete(&models.PackageAdvertiser{}).Error; err != nil {
					c.JSON(500, gin.H{"error": "Failed to clear old relationships"})
					return
				}
				
				// เพิ่ม relationships ใหม่
				for _, advertiserIDStr := range advertiserIds {
					advertiserUUID, err := uuid.Parse(advertiserIDStr)
					if err != nil {
						c.JSON(400, gin.H{"error": "Invalid advertiser ID format"})
						return
					}
					
					relationship := models.PackageAdvertiser{
						TravelPackageID: packageUUID,
						AdvertiserID:    advertiserUUID,
					}
					
					if err := db.Create(&relationship).Error; err != nil {
						c.JSON(500, gin.H{"error": "Failed to create advertiser relationship"})
						return
					}
				}
				
				// อัปเดต primary advertiser_id (ใช้ advertiser คนแรกเป็น primary)
				if advertiserUUID, err := uuid.Parse(advertiserIds[0]); err == nil {
					updateData["advertiser_id"] = advertiserUUID
				}
			}
		}
	}
	
	// อัพเดต package
	result := db.Model(&existingPkg).Updates(updateData)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	// ดึงข้อมูล package ที่อัพเดตแล้วส่งกลับพร้อม advertisers
	var updatedPkg models.TravelPackage
	db.Where("id = ?", packageUUID).Preload("Advertiser").Preload("Advertisers").First(&updatedPkg)
	convertTagsToArray(&updatedPkg)
	
	c.JSON(200, updatedPkg)
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
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	if err := db.Where("id = ?", packageUUID).First(&pkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ลบ relationships เก่าทั้งหมด
	if err := db.Where("travel_package_id = ?", packageUUID).Delete(&models.PackageAdvertiser{}).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to clear old relationships"})
		return
	}
	
	// เพิ่ม relationships ใหม่
	for _, advertiserIDStr := range updateData.AdvertiserIds {
		advertiserUUID, err := uuid.Parse(advertiserIDStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid advertiser ID format"})
			return
		}
		
		relationship := models.PackageAdvertiser{
			TravelPackageID: packageUUID,
			AdvertiserID:    advertiserUUID,
		}
		
		if err := db.Create(&relationship).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create advertiser relationship"})
			return
		}
	}
	
	// อัปเดต primary advertiser_id (ใช้ advertiser คนแรกเป็น primary)
	var primaryAdvertiserID *uuid.UUID
	if len(updateData.AdvertiserIds) > 0 {
		if advertiserUUID, err := uuid.Parse(updateData.AdvertiserIds[0]); err == nil {
			primaryAdvertiserID = &advertiserUUID
		}
	}
	
	if err := db.Model(&pkg).Update("advertiser_id", primaryAdvertiserID).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update primary advertiser"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Package advertisers updated successfully"})
}

// ดึงรายชื่อ advertiser ของ package (รองรับ multiple advertisers)
func GetPackageAdvertisersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	// Convert packageID string to UUID
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	// ใช้ GORM association เพื่อดึง advertisers ทั้งหมด
	var pkg models.TravelPackage
	if err := db.Where("id = ?", packageUUID).Preload("Advertisers").First(&pkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	// ส่งกลับ advertisers array
	c.JSON(200, pkg.Advertisers)
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


// ดึง tags ทั้งหมดที่ใช้ใน travel packages
func GetAllTagsHandler(c *gin.Context, db *gorm.DB) {
	var packages []models.TravelPackage
	
	// ดึง travel packages ที่มี tags (ไม่เป็นค่าว่าง)
	result := db.Select("tags").Where("tags IS NOT NULL AND tags != ''").Find(&packages)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	// รวบรวม tags ทั้งหมดใน Set เพื่อไม่ให้ซ้ำ
	tagSet := make(map[string]bool)
	for _, pkg := range packages {
		if pkg.Tags != "" {
			// ลบ { และ } ออกจาก string
			cleanedTags := strings.ReplaceAll(pkg.Tags, "{", "")
			cleanedTags = strings.ReplaceAll(cleanedTags, "}", "")
			
			// แปลง string เป็น array โดยแยกด้วย comma
			tags := strings.Split(cleanedTags, ",")
			
			// เพิ่มแต่ละ tag ลงใน set
			for _, tag := range tags {
				trimmed := strings.TrimSpace(tag)
				if trimmed != "" {
					tagSet[trimmed] = true
				}
			}
		}
	}
	
	// แปลง set เป็น array
	var allTags []string
	for tag := range tagSet {
		allTags = append(allTags, tag)
	}
	
	c.JSON(200, allTags)
}

// Service สำหรับดึง travel packages ทั้งหมด
func GetAllTravelPackages(db *gorm.DB) ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	return packages, result.Error
}