package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
	"gorm.io/gorm"
)

type CreateBookingPaymentRequest struct {
	PackageID        uuid.UUID  `json:"packageId" binding:"required"`
	GuestCount       int        `json:"guestCount" binding:"required,min=1"`
	TotalAmount      float64    `json:"totalAmount" binding:"required,min=0"`
	FinalAmount      float64    `json:"finalAmount" binding:"required,min=0"`
	DiscountCodeID   *uuid.UUID `json:"discount_code_id,omitempty"`
	GlobalCodeID     *uuid.UUID `json:"global_code_id,omitempty"`
	ContactName      string     `json:"contact_name" binding:"required"`
	ContactPhone     string     `json:"contact_phone" binding:"required"`
	ContactEmail     string     `json:"contact_email" binding:"required,email"`
	SpecialRequests  *string    `json:"special_requests"`
}

func CreateBookingPaymentHandler(c *gin.Context, db *gorm.DB) {
	var req CreateBookingPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDStr, ok := userID.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}
		var err error
		userUUID, err = uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
			return
		}
	}

	var travelPackage models.TravelPackage
	if err := db.First(&travelPackage, "id = ?", req.PackageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Package not found"})
		return
	}

	expiresAt := time.Now().Add(10 * time.Minute)
	booking := models.Booking{
		CustomerID:      userUUID,
		PackageID:       req.PackageID,
		GuestCount:      req.GuestCount,
		BookingDate:     time.Now().Format("2006-01-02"),
		TotalAmount:     req.TotalAmount,
		DiscountAmount:  req.TotalAmount - req.FinalAmount,
		FinalAmount:     req.FinalAmount,
		DiscountCodeID:  req.DiscountCodeID,
		GlobalCodeID:    req.GlobalCodeID,
		Status:          "pending",
		PaymentStatus:   "pending",
		ExpiresAt:       &expiresAt,
		ContactName:     req.ContactName,
		ContactPhone:    req.ContactPhone,
		ContactEmail:    req.ContactEmail,
		SpecialRequests: req.SpecialRequests,
	}

	fmt.Printf("🎫 Creating booking with discount info:\n")
	fmt.Printf("   - Discount Code ID: %v\n", req.DiscountCodeID)
	fmt.Printf("   - Global Code ID: %v\n", req.GlobalCodeID)
	fmt.Printf("   - Discount Amount: %.2f\n", req.TotalAmount - req.FinalAmount)

	if err := db.Create(&booking).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking"})
		return
	}

	fmt.Printf("Booking created successfully with ID: %s\n", booking.ID)

	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	if stripeKey == "" || stripeKey == "sk_test_51234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12" {
		mockSessionID := "cs_test_mock_" + booking.ID.String()
		
		booking.StripePaymentIntentID = &mockSessionID
		db.Save(&booking)

		mockSuccessURL := fmt.Sprintf("%s/payment/success?session_id=%s&booking_id=%s", 
			os.Getenv("FRONTEND_URL"), mockSessionID, booking.ID.String())

		c.JSON(http.StatusOK, gin.H{
			"url":        mockSuccessURL,
			"session_id": mockSessionID,
			"booking_id": booking.ID,
			"mock_mode":  true,
			"message":    "Mock payment - automatically successful",
		})
		return
	}

	stripe.Key = stripeKey

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("thb"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(travelPackage.Title),
						Description: stripe.String(fmt.Sprintf("ทริป %s สำหรับ %d ท่าน", travelPackage.Title, req.GuestCount)),
					},
					  UnitAmount: stripe.Int64(int64(req.FinalAmount * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(os.Getenv("FRONTEND_URL") + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(os.Getenv("FRONTEND_URL") + "/packages/" + req.PackageID.String()),
		ClientReferenceID: stripe.String(booking.ID.String()),
		CustomerEmail: stripe.String(req.ContactEmail),
		Metadata: map[string]string{
			"booking_id":  booking.ID.String(),
			"package_id":  req.PackageID.String(),
			"guest_count": strconv.Itoa(req.GuestCount),
		},
	}

	stripeSession, err := session.New(params)
	if err != nil {
		db.Delete(&booking)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment session"})
		return
	}

	booking.StripePaymentIntentID = &stripeSession.ID
	db.Save(&booking)

	c.JSON(http.StatusOK, gin.H{
		"url":        stripeSession.URL,
		"session_id": stripeSession.ID,
		"booking_id": booking.ID,
	})
}

func GetBookingsByPackageQueryHandler(c *gin.Context, db *gorm.DB) {
	packageID := c.Query("package_id")
	if packageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "package_id query parameter is required"})
		return
	}

	var bookings []models.Booking
	result := db.Select("id, customer_id, package_id, booking_date, guest_count, status, payment_status, contact_name, contact_phone, contact_email, special_requests, total_amount, final_amount, expires_at, created_at, updated_at").
		Where("package_id = ?", packageID).
		Order("booking_date DESC").
		Find(&bookings)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"bookings": bookings,
		"total":    len(bookings),
		"package_id": packageID,
	})
}

func ConfirmPaymentHandler(c *gin.Context, db *gorm.DB) {
	bookingID := c.Param("bookingId")
	if bookingID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "booking_id is required"})
		return
	}

	var booking models.Booking
	if err := db.First(&booking, "id = ?", bookingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	var pkg models.TravelPackage
	if err := db.First(&pkg, booking.PackageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Package not found"})
		return
	}

	result := db.Model(&models.Booking{}).
		Where("id = ?", bookingID).
		Updates(map[string]interface{}{
			"payment_status": "paid",
			"status":         "confirmed",
			"expires_at":     nil,
		})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update booking status",
			"details": result.Error.Error(),
		})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	go SendPaymentSuccessNotification(booking, db)

	go SendNewBookingNotificationToAdvertiser(booking, pkg, db)

	if booking.DiscountCodeID != nil {
		var discountCode models.DiscountCode
		if err := db.First(&discountCode, *booking.DiscountCodeID).Error; err == nil {
			go CreateCommission(booking.ID, discountCode.AdvertiserID, *booking.DiscountCodeID, 
							   booking.FinalAmount, discountCode.CommissionRate, db)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment confirmed successfully",
		"booking_id": bookingID,
		"status": "confirmed",
		"payment_status": "paid",
	})
}