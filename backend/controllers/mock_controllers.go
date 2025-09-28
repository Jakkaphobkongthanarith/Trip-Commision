package controllers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Mock handlers - จะต้องเพิ่ม models และ logic จริงในภายหลัง

// Users handlers
func GetAllUsersHandler(c *gin.Context, db *gorm.DB) {
	// Mock data for now - ต้องสร้าง User model และ query จริง
	c.JSON(200, gin.H{
		"message": "GetAllUsers - Not implemented yet",
		"data":    []interface{}{},
	})
}

func GetCurrentUserRoleHandler(c *gin.Context, db *gorm.DB) {
	// Get Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(401, gin.H{"error": "Authorization header required"})
		return
	}

	// For now, just return mock data but show we got the token
	// ในอนาคตจะต้อง verify JWT token กับ Supabase
	c.JSON(200, gin.H{
		"user_id": "00000000-0000-0000-0000-000000000000",
		"role":    "user", // ค่า default จนกว่าจะ verify JWT token จริง
		"token_received": authHeader != "", // แสดงว่าได้รับ token แล้ว
	})
}

func UpdateCurrentUserRoleHandler(c *gin.Context, db *gorm.DB) {
	var req struct {
		Role string `json:"role"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(200, gin.H{
		"message": "UpdateCurrentUserRole - Not implemented yet",
		"role":    req.Role,
	})
}

func UpdateUserRoleHandler(c *gin.Context, db *gorm.DB) {
	userId := c.Param("userId")
	c.JSON(200, gin.H{
		"message": "UpdateUserRole - Not implemented yet",
		"userId":  userId,
	})
}

// Bookings handlers
func GetAllBookingsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{
		"message": "GetAllBookings - Not implemented yet",
		"data":    []interface{}{},
	})
}

func GetBookingsByPackageHandler(c *gin.Context, db *gorm.DB) {
	packageId := c.Param("packageId")
	c.JSON(200, gin.H{
		"message":   "GetBookingsByPackage - Not implemented yet",
		"packageId": packageId,
		"data":      []interface{}{},
	})
}

// Reviews handlers
func GetAllReviewsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{
		"message": "GetAllReviews - Not implemented yet",
		"data":    []interface{}{},
	})
}

func GetReviewsByPackageHandler(c *gin.Context, db *gorm.DB) {
	packageId := c.Param("packageId")
	c.JSON(200, gin.H{
		"message":   "GetReviewsByPackage - Not implemented yet",
		"packageId": packageId,
		"data":      []interface{}{},
	})
}

// Commissions handlers
func GetCommissionsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{
		"message": "GetCommissions - Not implemented yet",
		"data":    []interface{}{},
	})
}

// Reviews handlers
func GetReviewsHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{
		"message": "GetReviews - Not implemented yet", 
		"data":    []interface{}{},
	})
}