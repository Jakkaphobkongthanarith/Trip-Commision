package controllers

import (
	"fmt"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
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