package controllers

import (
	"fmt"
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ส่ง notification เมื่อ advertiser ได้รับโค้ดส่วนลดใหม่
func SendNotificationToAdvertiser(advertiserID uuid.UUID, discountCode models.DiscountCode, db *gorm.DB) {
	notification := models.Notification{
		UserID:   advertiserID,
		Title:    "🎉 โค้ดส่วนลดใหม่!",
		Message:  fmt.Sprintf("คุณได้รับโค้ดส่วนลด %v%% สำหรับแพคเกจ %s โค้ด: %s", 
				   discountCode.DiscountPercentage, discountCode.Package.Title, discountCode.Code),
		Type:     "discount_code",
		Category: "info",
		Priority: 2,
		ActionURL: "/advertiser/discount-codes",
		Data: map[string]interface{}{
			"discount_code_id": discountCode.ID,
			"package_id": discountCode.PackageID,
			"code": discountCode.Code,
			"discount_percentage": discountCode.DiscountPercentage,
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
		Data: map[string]interface{}{
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
		Data: map[string]interface{}{
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
		Data: map[string]interface{}{
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