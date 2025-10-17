package controllers

import (
	"fmt"
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ส่ง notification เมื่อ advertiser ได้รับโค้ดส่วนลดใหม่
func SendNotificationToAdvertiser(advertiserID uuid.UUID, discountCode models.DiscountCode, db *gorm.DB) {
	// สร้าง message ตาม discount type
	discountText := ""
	if discountCode.DiscountType == "percentage" {
		discountText = fmt.Sprintf("%.0f%%", discountCode.DiscountValue)
	} else {
		discountText = fmt.Sprintf("฿%.0f", discountCode.DiscountValue)
	}

	notification := models.Notification{
		UserID:   advertiserID,
		Title:    "🎉 โค้ดส่วนลดใหม่!",
		Message:  fmt.Sprintf("คุณได้รับโค้ดส่วนลด %s สำหรับแพคเกจ %s โค้ด: %s", 
				   discountText, discountCode.Package.Title, discountCode.Code),
		Type:     "discount_code",
		Category: "info",
		Priority: 2,
		ActionURL: "/advertiser/discount-codes",
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

// ส่ง notification เมื่อได้รับค่าคอมมิชชั่น
func SendCommissionEarnedNotification(commission models.Commission, db *gorm.DB) {
	// ดึงข้อมูล discount code และ booking
	var discountCode models.DiscountCode
	var booking models.Booking
	
	db.Preload("Package").First(&discountCode, commission.DiscountCodeID)
	db.First(&booking, commission.BookingID)

	notification := models.Notification{
		UserID:   commission.AdvertiserID,
		Title:    "💰 ได้รับค่าคอมมิชชั่น!",
		Message:  fmt.Sprintf("คุณได้รับค่าคอมมิชชั่น ฿%.2f จากโค้ด %s ในแพคเกจ %s", 
				   commission.CommissionAmount, discountCode.Code, discountCode.Package.Title),
		Type:     "commission_earned",
		Category: "info",
		Priority: 2,
		ActionURL: "/advertiser/commissions",
		Data: models.JSONMap{
			"commission_id": commission.ID,
			"amount": commission.CommissionAmount,
			"discount_code": discountCode.Code,
			"package_title": discountCode.Package.Title,
		},
	}

	db.Create(&notification)
}

// ส่ง notification เมื่อมีการจองใหม่
func SendNewBookingNotificationToAdvertiser(booking models.Booking, pkg models.TravelPackage, db *gorm.DB) {
	// คำนวณจำนวนการจองปัจจุบัน
	var currentBookings int64
	db.Model(&models.Booking{}).Where("package_id = ? AND status IN (?)", pkg.ID, []string{"confirmed", "completed"}).Count(&currentBookings)
	
	if pkg.AdvertiserID == nil {
		return // ไม่มี advertiser
	}

	notification := models.Notification{
		UserID:   *pkg.AdvertiserID,
		Title:    "🎉 มีการจองใหม่!",
		Message:  fmt.Sprintf("แพคเกจ %s มีการจองแล้ว (%d/%d คน)", 
				   pkg.Title, currentBookings, pkg.MaxGuests),
		Type:     "new_booking",
		Category: "important", 
		Priority: 1,
		ActionURL: fmt.Sprintf("/advertiser/bookings?package_id=%s", pkg.ID),
		Data: models.JSONMap{
			"package_id": pkg.ID,
			"booking_id": booking.ID,
			"current_bookings": currentBookings,
			"max_guests": pkg.MaxGuests,
		},
	}

	db.Create(&notification)
}

// ส่ง notification เมื่อชำระเงินสำเร็จ
func SendPaymentSuccessNotification(booking models.Booking, db *gorm.DB) {
	// ดึงข้อมูลแพคเกจ
	var pkg models.TravelPackage
	db.First(&pkg, booking.PackageID)

	notification := models.Notification{
		UserID:   booking.CustomerID,
		Title:    "✅ จองสำเร็จ!",
		Message:  fmt.Sprintf("การจอง %s ของคุณสำเร็จแล้ว เตรียมพร้อมสำหรับการเดินทาง!", pkg.Title),
		Type:     "booking_success",
		Category: "important",
		Priority: 1,
		ActionURL: fmt.Sprintf("/bookings/%s", booking.ID),
		Data: models.JSONMap{
			"booking_id": booking.ID,
			"package_title": pkg.Title,
			"amount": booking.TotalAmount,
		},
	}

	db.Create(&notification)
}

// สร้าง commission และส่ง notification
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

	// ส่ง notification ให้ advertiser
	go SendCommissionEarnedNotification(commission, db)

	return nil
}

// ส่ง notification เมื่อมีโค้ดส่วนลดทั่วไปใหม่ (ส่งให้ทุกคน)
func SendGlobalDiscountCodeNotification(globalCode models.GlobalDiscountCode, db *gorm.DB) {
	// สร้าง message ตาม discount type
	discountText := ""
	if globalCode.DiscountType == "percentage" {
		discountText = fmt.Sprintf("%.0f%%", globalCode.DiscountValue)
	} else {
		discountText = fmt.Sprintf("฿%.0f", globalCode.DiscountValue)
	}

	// ดึง users ทั้งหมด (global discount code ใช้ได้กับทุกคน)
	var users []models.User
	db.Find(&users)

	// สร้าง notifications สำหรับทุกคน
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

	// Batch insert notifications
	if len(notifications) > 0 {
		db.Create(&notifications)
		fmt.Printf("Sent %d global discount code notifications for code: %s\n", len(notifications), globalCode.Code)
	}
}