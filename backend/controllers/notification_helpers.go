package controllers

import (
	"fmt"
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)
 
func SendNotificationToAdvertiser(advertiserID uuid.UUID, discountCode models.DiscountCode, db *gorm.DB) {
	discountText := ""
	if discountCode.DiscountType == "percentage" {
		discountText = fmt.Sprintf("%.0f%%", discountCode.DiscountValue)
	} else {
		discountText = fmt.Sprintf("฿%.0f", discountCode.DiscountValue)
	}

	notification := models.Notification{
		UserID:   advertiserID,
		Title:    "โค้ดส่วนลดใหม่!",
		Message:  fmt.Sprintf("คุณได้รับโค้ดส่วนลด %s สำหรับแพคเกจ %s โค้ด: %s", 
				   discountText, discountCode.Package.Title, discountCode.Code),
		Type:     "discount_code",
		Category: "info",
		Priority: 2,
		ActionURL: "/advertiser",
		Data: models.JSONMap{
			"discount_code_id": discountCode.ID,
			"package_id": discountCode.PackageID,
			"code": discountCode.Code,
			"discount_value": discountCode.DiscountValue,
			"discount_type": discountCode.DiscountType,
		},
	}

	db.Create(&notification)
}

 

 
func SendNewBookingNotificationToAdvertiser(booking models.Booking, pkg models.TravelPackage, db *gorm.DB) {
 
	var currentBookings int64
	db.Model(&models.Booking{}).Where("package_id = ? AND status IN (?)", pkg.ID, []string{"confirmed", "completed"}).Count(&currentBookings)
	
	if pkg.AdvertiserID == nil {
		return
	}

	notification := models.Notification{
		UserID:   *pkg.AdvertiserID,
		Title:    "มีการจองใหม่!",
		Message:  fmt.Sprintf("แพคเกจ %s มีการจองแล้ว (%d/%d คน)", 
				   pkg.Title, currentBookings, pkg.MaxGuests),
		Type:     "new_booking",
		Category: "important", 
		Priority: 1,
		ActionURL: "/advertiser",
		Data: models.JSONMap{
			"package_id": pkg.ID,
			"booking_id": booking.ID,
			"current_bookings": currentBookings,
			"max_guests": pkg.MaxGuests,
		},
	}

	db.Create(&notification)
}

 
func SendPaymentSuccessNotification(booking models.Booking, db *gorm.DB) {
 
	var pkg models.TravelPackage
	db.First(&pkg, booking.PackageID)

	notification := models.Notification{
		UserID:   booking.CustomerID,
		Title:    "การจองสำเร็จ!",
		Message:  fmt.Sprintf("การจอง %s ของคุณสำเร็จแล้ว เตรียมพร้อมสำหรับการเดินทาง!", pkg.Title),
		Type:     "booking_success",
		Category: "important",
		Priority: 1,
		ActionURL: "/profile",
		Data: models.JSONMap{
			"booking_id": booking.ID,
			"package_title": pkg.Title,
			"amount": booking.TotalAmount,
		},
	}

	db.Create(&notification)
}

 
func CreateCommission(bookingID, advertiserID, discountCodeID uuid.UUID, amount, commissionRate float64, db *gorm.DB) error {
	commissionAmount := amount * (commissionRate / 100)
	
	commission := models.Commission{
		BookingID:            bookingID,
		AdvertiserID:         advertiserID,
		DiscountCodeID:       &discountCodeID,
		CommissionAmount:     commissionAmount,
		CommissionPercentage: commissionRate,
		Status:               "pending",
	}

	if err := db.Create(&commission).Error; err != nil {
		return err
	}

 

	return nil
}

 
func SendGlobalDiscountCodeNotification(globalCode models.GlobalDiscountCode, db *gorm.DB) {
 
	discountText := ""
	if globalCode.DiscountType == "percentage" {
		discountText = fmt.Sprintf("%.0f%%", globalCode.DiscountValue)
	} else {
		discountText = fmt.Sprintf("฿%.0f", globalCode.DiscountValue)
	}

	var users []models.Profile
	db.Find(&users)

	var notifications []models.Notification
	for _, user := range users {
		notification := models.Notification{
			UserID:   user.ID,
			Title:    "🎁 โค้ดส่วนลดใหม่!",
			Message:  fmt.Sprintf("โค้ดส่วนลด %s ใช้ได้กับทุกแพคเกจ! โค้ด: %s", 
					   discountText, globalCode.Code),
			Type:     "global_discount_code",
			Category: "promotion",
			Priority: 2,
			ActionURL: "/packages",
			Data: models.JSONMap{
				"global_code_id": globalCode.ID,
				"code": globalCode.Code,
				"discount_value": globalCode.DiscountValue,
				"discount_type": globalCode.DiscountType,
			},
		}
		notifications = append(notifications, notification)
	}

 
	if len(notifications) > 0 {
		db.Create(&notifications)
		fmt.Printf("Sent %d global discount code notifications for code: %s\n", len(notifications), globalCode.Code)
	}
}