package controllers

import (
	"net/http"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UserForQuery is a lightweight struct for querying users without JSONB fields
type UserForQuery struct {
	ID               string    `json:"id" gorm:"column:id"`
	Email            string    `json:"email" gorm:"column:email"`
	Phone            *string   `json:"phone" gorm:"column:phone"`
	EmailConfirmedAt *time.Time `json:"email_confirmed_at" gorm:"column:email_confirmed_at"`
	LastSignInAt     *time.Time `json:"last_sign_in_at" gorm:"column:last_sign_in_at"`
	CreatedAt        time.Time `json:"created_at" gorm:"column:created_at"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"column:updated_at"`
	Role             *models.UserRole `json:"role" gorm:"foreignKey:UserID;references:ID"`
	Profile          *models.Profile  `json:"profile" gorm:"foreignKey:UserID;references:ID"`
}

// TableName สำหรับ UserForQuery
func (UserForQuery) TableName() string {
	return "auth.users"
}

// UserResponse สำหรับ API response โดยไม่รวม JSONB fields ที่มีปัญหา
type UserResponse struct {
	ID               string         `json:"id"`
	Email            string         `json:"email"`
	Phone            *string        `json:"phone"`
	EmailConfirmedAt *time.Time     `json:"email_confirmed_at"`
	LastSignInAt     *time.Time     `json:"last_sign_in_at"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	Role             *models.UserRole `json:"role"`
	Profile          *models.Profile  `json:"profile"`
}

func GetAllUsersHandler(c *gin.Context, db *gorm.DB) {
	var users []UserForQuery

	// Query users using the lightweight struct
	err := db.Preload("Role").Preload("Profile").Find(&users).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch users",
			"details": err.Error(),
		})
		return
	}

	// Convert to response format
	var userResponses []UserResponse
	for _, user := range users {
		userResponses = append(userResponses, UserResponse{
			ID:               user.ID,
			Email:            user.Email,
			Phone:            user.Phone,
			EmailConfirmedAt: user.EmailConfirmedAt,
			LastSignInAt:     user.LastSignInAt,
			CreatedAt:        user.CreatedAt,
			UpdatedAt:        user.UpdatedAt,
			Role:             user.Role,
			Profile:          user.Profile,
		})
	}

	c.JSON(http.StatusOK, userResponses)
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


func GetCommissionsHandler(c *gin.Context, db *gorm.DB) {
	var commissions []map[string]interface{}
	
	// Query commissions with JOIN to get more details
	err := db.Raw(`
		SELECT 
			c.id,
			c.booking_id,
			c.commission_amount,
			c.commission_percentage,
			c.status,
			c.created_at,
			b.customer_id as advertiser_id,
			b.package_id
		FROM commissions c
		LEFT JOIN bookings b ON c.booking_id = b.id
		ORDER BY c.created_at DESC
	`).Scan(&commissions).Error
	
	if err != nil {
		c.JSON(500, gin.H{
			"error":   "Failed to fetch commissions",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(200, commissions)
}
