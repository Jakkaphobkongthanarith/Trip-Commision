package controllers

import (
	"net/http"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetAllUsersHandler(c *gin.Context, db *gorm.DB) {
	var users []models.User

	// Query users with their roles and profiles
	err := db.Preload("Role").Preload("Profile").Find(&users).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch users",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"count": len(users),
	})
}

// Placeholder handlers สำหรับ routes ที่ยังไม่ implement
func UpdateUserRoleHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "UpdateUserRole - Not implemented yet"})
}

func GetAllBookingsHandler(c *gin.Context, db *gorm.DB) {
	var bookings []models.Booking
	result := db.Preload("TravelPackages").Find(&bookings)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookings": bookings,
		"total":    len(bookings),
	})
}

func GetBookingsByPackageHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "GetBookingsByPackage - Not implemented yet", "data": []interface{}{}})
}

func GetAllReviewsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "GetAllReviews - Not implemented yet", "data": []interface{}{}})
}

func GetReviewsByPackageHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "GetReviewsByPackage - Not implemented yet", "data": []interface{}{}})
}

func GetCommissionsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "GetCommissions - Not implemented yet", "data": []interface{}{}})
}

func GetReviewsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "GetReviews - Not implemented yet", "data": []interface{}{}})
}