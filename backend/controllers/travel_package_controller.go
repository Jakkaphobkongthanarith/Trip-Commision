package controllers

import (
	"fmt"
	"strings"
	"trip-trader-backend/models"
	"trip-trader-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Get all packages for a given advertiser
	func GetAdvertiserPackagesHandler(c *gin.Context, db *gorm.DB) {
		advertiserID := c.Param("advertiser_id")
		if advertiserID == "" {
			c.JSON(400, gin.H{"error": "Missing advertiser_id"})
			return
		}

		var packages []models.TravelPackage
		// Join package_advertisers to get all packages for this advertiser
		err := db.Table("travel_packages").
			Joins("JOIN package_advertisers ON travel_packages.id = package_advertisers.travel_package_id").
			Where("package_advertisers.advertiser_id = ?", advertiserID).
			Find(&packages).Error
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		// Convert tags for frontend compatibility
		packages = convertAllPackagesTags(packages)
		c.JSON(200, packages)
	}

func convertTagsToArray(pkg *models.TravelPackage) {
	if pkg.Tags != "" {
		cleanedTags := strings.ReplaceAll(pkg.Tags, "{", "")
		cleanedTags = strings.ReplaceAll(cleanedTags, "}", "")
		
		tags := strings.Split(cleanedTags, ",")
		
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

func convertAllPackagesTags(packages []models.TravelPackage) []models.TravelPackage {
	for i := range packages {
		convertTagsToArray(&packages[i])
	}
	return packages
}

func GetAllPackagesHandler(c *gin.Context, db *gorm.DB) {
	println("Fetching all active packages with advertisers")
	
	cleanService := &services.PackageStatsService{DB: db}
	packages, err := cleanService.GetAllPackagesWithStats()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	packages = convertAllPackagesTags(packages)
	
	c.JSON(200, packages)
}

func GetPackageByIDHandler(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	
	packageUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	println("Searching for active package with ID:", id)
	
	cleanService := &services.PackageStatsService{DB: db}
	pkg, err := cleanService.GetPackageWithStats(packageUUID)
	if err != nil {
		println("Error:", err.Error())
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{
				"error": "Package not found or has been deactivated", 
				"id": id,
			})
		} else {
			c.JSON(404, gin.H{
				"error": "Package not found", 
				"id": id,
				"sql_error": err.Error(),
			})
		}
		return
	}
	
	convertTagsToArray(pkg)
	
	c.JSON(200, *pkg)
}

func CreatePackageHandler(c *gin.Context, db *gorm.DB) {
	var requestData map[string]interface{}
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	
	pkg := models.TravelPackage{}
	
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
	
	if availableFrom, ok := requestData["available_from"].(string); ok && availableFrom != "" {
		pkg.AvailableFrom = &availableFrom
	}
	if availableTo, ok := requestData["available_to"].(string); ok && availableTo != "" {
		pkg.AvailableTo = &availableTo
	}
	
	if tags, ok := requestData["tags"].(string); ok {
		pkg.Tags = tags
	}
	
	pkg.ID = uuid.New()
	
	trueValue := true
	pkg.IsActive = &trueValue

	// Generate unique display_id (auto-increment style)
	var maxDisplayID int
	db.Model(&models.TravelPackage{}).Select("COALESCE(MAX(display_id), 0)").Scan(&maxDisplayID)
	pkg.DisplayID = maxDisplayID + 1
	
	result := db.Create(&pkg)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	convertTagsToArray(&pkg)
	
	c.JSON(200, pkg)
}

func UpdatePackageHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	var requestData map[string]interface{}
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	
	var existingPkg models.TravelPackage
	if err := db.Where("id = ?", packageUUID).First(&existingPkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
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
	
	// Handle is_active boolean field
	if isActive, ok := requestData["is_active"].(bool); ok {
		updateData["is_active"] = isActive
		fmt.Printf("Updating is_active to: %v\n", isActive)
	}
	
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
	
	if tags, ok := requestData["tags"].(string); ok {
		updateData["tags"] = tags
	}

	if advertiserIdsInterface, ok := requestData["advertiser_ids"]; ok {
		fmt.Printf("Received advertiser_ids: %+v (Type: %T)\n", advertiserIdsInterface, advertiserIdsInterface)
		
		if advertiserIdsSlice, ok := advertiserIdsInterface.([]interface{}); ok {
			var advertiserIds []string
			for _, id := range advertiserIdsSlice {
				if idStr, ok := id.(string); ok {
					advertiserIds = append(advertiserIds, idStr)
					   fmt.Printf("Added advertiser ID: %s\n", idStr)
				} else {
					 fmt.Printf("Invalid advertiser ID type: %+v (Type: %T)\n", id, id)
				}
			}
			
			   fmt.Printf("Total advertiser IDs parsed: %d\n", len(advertiserIds))
			
			if len(advertiserIds) > 0 {
				if err := db.Where("travel_package_id = ?", packageUUID).Delete(&models.PackageAdvertiser{}).Error; err != nil {
					c.JSON(500, gin.H{"error": "Failed to clear old relationships"})
					return
				}
				
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
					
					fmt.Printf("Creating relationship: Package %s <-> Advertiser %s\n", packageUUID, advertiserUUID)
					
					if err := db.Create(&relationship).Error; err != nil {
						 fmt.Printf("Failed to create relationship: %v\n", err)
						c.JSON(500, gin.H{
							"error": "Failed to create advertiser relationship",
							"details": err.Error(),
							"package_id": packageUUID.String(),
							"advertiser_id": advertiserUUID.String(),
						})
						return
					}
					
					fmt.Printf("Relationship created successfully\n")
				}
			}
		}
	}
	
	result := db.Model(&existingPkg).Updates(updateData)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	var updatedPkg models.TravelPackage
	db.Where("id = ?", packageUUID).First(&updatedPkg)
	
	// Load advertisers via many-to-many relationship
	var advertisers []models.Profile
	db.Table("package_advertisers").
		Select("profiles.*").
		Joins("JOIN profiles ON profiles.id = package_advertisers.advertiser_id").
		Where("package_advertisers.travel_package_id = ?", packageUUID).
		Find(&advertisers)
	updatedPkg.Advertisers = advertisers
	
	convertTagsToArray(&updatedPkg)
	
	c.JSON(200, updatedPkg)
}

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
	
	var updatedPkg models.TravelPackage
	db.Where("id = ?", packageID).First(&updatedPkg)
	
	c.JSON(200, gin.H{
		"message": "Current bookings updated successfully",
		"package": updatedPkg,
	})
}

func GetPackageConfirmedUsersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("packageId")
	
	var bookings []models.Booking
	result := db.Where("package_id = ? AND status = ?", packageID, "confirmed").
		Preload("TravelPackages").
		Preload("Profile").
		Find(&bookings)
	
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	c.JSON(200, bookings)
}



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
	
	if err := db.Where("travel_package_id = ?", packageUUID).Delete(&models.PackageAdvertiser{}).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to clear old relationships"})
		return
	}
	
	for _, advertiserIDStr := range updateData.AdvertiserIds {
		advertiserUUID, err := uuid.Parse(advertiserIDStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid advertiser ID format"})
			return
		}

		var profile models.Profile
		if err := db.Where("id = ? AND user_role = ?", advertiserUUID, "advertiser").First(&profile).Error; err != nil {
			c.JSON(400, gin.H{"error": "Advertiser not found or invalid role"})
			return
		}
		
		relationship := models.PackageAdvertiser{
			TravelPackageID: packageUUID,
			AdvertiserID:    advertiserUUID,
		}
		
		if err := db.Create(&relationship).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to create advertiser relationship", "details": err.Error()})
			return
		}
	}
	
	c.JSON(200, gin.H{"message": "Package advertisers updated successfully"})
}

func GetPackageAdvertisersHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	var pkg models.TravelPackage
	if err := db.Where("id = ?", packageUUID).Preload("Advertisers").First(&pkg).Error; err != nil {
		c.JSON(404, gin.H{"error": "Package not found"})
		return
	}
	
	c.JSON(200, pkg.Advertisers)
}

func DeletePackageHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Param("id")
	
	packageUUID, err := uuid.Parse(packageID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid package ID format"})
		return
	}
	
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	var pkg models.TravelPackage
	if err := tx.First(&pkg, packageUUID).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{"error": "Package not found"})
		} else {
			c.JSON(500, gin.H{"error": "Failed to find package"})
		}
		return
	}
	
	if pkg.IsActive != nil && !*pkg.IsActive {
		tx.Rollback()
		c.JSON(400, gin.H{"error": "Package is already deactivated"})
		return
	}
	
	falseValue := false
	if err := tx.Model(&models.DiscountCode{}).
		Where("package_id = ? AND is_active = ?", packageUUID, true).
		Update("is_active", &falseValue).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to deactivate discount codes"})
		return
	}
	
	if err := tx.Model(&models.TravelPackage{}).
		Where("id = ?", packageUUID).
		Update("is_active", &falseValue).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to deactivate package"})
		return
	}
	
	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to commit transaction"})
		return
	}
	
	c.JSON(200, gin.H{
		"message": "Package deactivated successfully",
		"note": "Package and related discount codes have been deactivated but preserved in database",
	})
	
	c.JSON(200, gin.H{"message": "Package deleted successfully"})
}


func GetAllTagsHandler(c *gin.Context, db *gorm.DB) {
	var packages []models.TravelPackage
	
	result := db.Select("tags").Where("tags IS NOT NULL AND tags != ''").Find(&packages)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	
	tagSet := make(map[string]bool)
	for _, pkg := range packages {
		if pkg.Tags != "" {
			cleanedTags := strings.ReplaceAll(pkg.Tags, "{", "")
			cleanedTags = strings.ReplaceAll(cleanedTags, "}", "")
			
			tags := strings.Split(cleanedTags, ",")
			
			for _, tag := range tags {
				trimmed := strings.TrimSpace(tag)
				if trimmed != "" {
					tagSet[trimmed] = true
				}
			}
		}
	}
	
	var allTags []string
	for tag := range tagSet {
		allTags = append(allTags, tag)
	}
	
	c.JSON(200, allTags)
}

func GetAllTravelPackages(db *gorm.DB) ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	result := db.Find(&packages)
	return packages, result.Error
}