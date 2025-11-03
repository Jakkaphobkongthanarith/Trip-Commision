package controllers

import (
	"net/http"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)
 
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
 
func (UserForQuery) TableName() string {
	return "auth.users"
}
 
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

	err := db.Preload("Role").Preload("Profile").Find(&users).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch users",
			"details": err.Error(),
		})
		return
	}

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
