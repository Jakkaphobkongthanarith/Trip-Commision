package controllers

import (
	"net/http"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserResponse represents the user data returned to client
type UserResponse struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
	Phone       string    `json:"phone"`
	Address     string    `json:"address"`
	UserRole    string    `json:"user_role"`
	DisplayID   int       `json:"display_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func GetAllUsersHandler(c *gin.Context, db *gorm.DB) {
	var profiles []models.Profile

	err := db.Find(&profiles).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch users",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	var userResponses []UserResponse
	for _, profile := range profiles {
		userResponses = append(userResponses, UserResponse{
			ID:          profile.ID.String(),
			Email:       profile.Email,
			DisplayName: profile.DisplayName,
			Phone:       profile.Phone,
			Address:     profile.Address,
			UserRole:    profile.UserRole,
			DisplayID:   profile.DisplayID,
			CreatedAt:   profile.CreatedAt,
			UpdatedAt:   profile.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, userResponses)
}

func UpdateUserRoleHandler(c *gin.Context, db *gorm.DB) {
	userId := c.Param("userId")
	
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}
	
	// Validate role
	if !models.IsValidRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":       "invalid role",
			"valid_roles": models.ValidRoles(),
		})
		return
	}
	
	userUUID, err := uuid.Parse(userId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID format"})
		return
	}

	// Update user role in profiles table
	result := db.Model(&models.Profile{}).
		Where("id = ?", userUUID).
		Update("user_role", req.Role)
	
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role", "details": result.Error.Error()})
		return
	}
	
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "role updated successfully",
		"user_id": userId,
		"role":    req.Role,
	})
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

func GetCommissionsHandler(c *gin.Context, db *gorm.DB) {
	type CommissionResult struct {
		ID                   string    `gorm:"column:id"`
		BookingID            string    `gorm:"column:booking_id"`
		CommissionAmount     float64   `gorm:"column:commission_amount"`
		CommissionPercentage float64   `gorm:"column:commission_percentage"`
		Status               string    `gorm:"column:status"`
		CreatedAt            time.Time `gorm:"column:created_at"`
		AdvertiserID         string    `gorm:"column:advertiser_id"`
		PackageID            string    `gorm:"column:package_id"`
	}

	var commissions []CommissionResult

	err := db.Table("commissions c").
		Select(`c.id,
				c.booking_id,
				c.commission_amount,
				c.commission_percentage,
				c.status,
				c.created_at,
				b.customer_id as advertiser_id,
				b.package_id`).
		Joins("LEFT JOIN bookings b ON c.booking_id = b.id").
		Order("c.created_at DESC").
		Find(&commissions).Error

	if err != nil {
		c.JSON(500, gin.H{
			"error":   "Failed to fetch commissions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(200, commissions)
}
