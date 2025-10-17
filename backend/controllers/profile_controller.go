package controllers

import (
	"fmt"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ดึง profiles ทั้งหมด
func GetAllProfilesHandler(c *gin.Context, db *gorm.DB) {
	var profiles []models.Profile
	result := db.Find(&profiles)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(200, profiles)
}

// ดึง profile โดย user_id
func GetProfileByUserIdHandler(c *gin.Context, db *gorm.DB) {
	userId := c.Param("userId")
	var profile models.Profile

	fmt.Println("=== DEBUG: GetProfileByUserIdHandler ===")
	fmt.Println("Searching for profile with user_id:", userId)

	result := db.Where("user_id = ?", userId).First(&profile)
	if result.Error != nil {
		fmt.Println("Error:", result.Error.Error())
		c.JSON(404, gin.H{
			"error":     "Profile not found",
			"user_id":   userId,
			"sql_error": result.Error.Error(),
		})
		return
	}

	fmt.Println("Profile found successfully!")
	c.JSON(200, profile)
}

// อัปเดต profile หรือสร้างใหม่ถ้าไม่มี (upsert)
func UpsertProfileHandler(c *gin.Context, db *gorm.DB) {
	userId := c.Param("userId")
	
	// Parse UUID
	userUUID, err := uuid.Parse(userId)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID format", "details": err.Error()})
		return
	}
	
	var profileData struct {
		DisplayName *string `json:"display_name"`
		Phone       *string `json:"phone"`
		Address     *string `json:"address"`
	}
	
	if err := c.ShouldBindJSON(&profileData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON data", "details": err.Error()})
		return
	}
	
	fmt.Println("=== DEBUG: UpsertProfileHandler ===")
	fmt.Println("User ID:", userId)
	fmt.Println("Profile Data:", profileData)
	
	var profile models.Profile
	
	// ลองหา profile ที่มีอยู่แล้ว
	result := db.Where("user_id = ?", userUUID).First(&profile)
	
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// สร้างใหม่ถ้าไม่มี
			profile = models.Profile{
				UserID: userUUID,
			}
			fmt.Println("Creating new profile...")
		} else {
			c.JSON(500, gin.H{"error": "Database error", "details": result.Error.Error()})
			return
		}
	} else {
		fmt.Println("Updating existing profile...")
	}
	
	// อัปเดตข้อมูล
	if profileData.DisplayName != nil {
		profile.DisplayName = *profileData.DisplayName
	}
	if profileData.Phone != nil {
		profile.Phone = *profileData.Phone
	}
	if profileData.Address != nil {
		profile.Address = *profileData.Address
	}
	
	// บันทึกข้อมูล
	if err := db.Save(&profile).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to save profile", "details": err.Error()})
		return
	}
	
	fmt.Println("Profile saved successfully!")
	c.JSON(200, gin.H{
		"message": "Profile updated successfully",
		"profile": profile,
	})
}