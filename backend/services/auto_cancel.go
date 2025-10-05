package services

import (
	"log"
	"time"
	"trip-trader-backend/models"

	"gorm.io/gorm"
)

// AutoCancelExpiredBookings - ยกเลิกการจองที่หมดเวลาอัตโนมัติ
func AutoCancelExpiredBookings(db *gorm.DB) {
	log.Println("Starting auto-cancel expired bookings check...")

	// หาการจองที่หมดเวลาแล้ว และยังไม่ได้ชำระเงิน
	var expiredBookings []models.Booking
	result := db.Where("expires_at < ? AND payment_status = ? AND status = ?", 
		time.Now(), "pending", "pending").Find(&expiredBookings)

	if result.Error != nil {
		log.Printf("Error fetching expired bookings: %v", result.Error)
		return
	}

	if len(expiredBookings) == 0 {
		log.Println("No expired bookings found")
		return
	}

	log.Printf("Found %d expired bookings to cancel", len(expiredBookings))

	// ยกเลิกการจองทีละรายการ
	for _, booking := range expiredBookings {
		// อัปเดตสถานะเป็น cancelled
		updateResult := db.Model(&booking).Updates(map[string]interface{}{
			"status":         "cancelled",
			"payment_status": "expired",
			"updated_at":     time.Now(),
		})

		if updateResult.Error != nil {
			log.Printf("Error cancelling booking %s: %v", booking.ID, updateResult.Error)
			continue
		}

		// ลด current_bookings ของ package
		packageUpdateResult := db.Model(&models.TravelPackage{}).
			Where("id = ?", booking.PackageID).
			Update("current_bookings", gorm.Expr("current_bookings - ?", booking.GuestCount))

		if packageUpdateResult.Error != nil {
			log.Printf("Error updating package bookings for booking %s: %v", booking.ID, packageUpdateResult.Error)
		}

		log.Printf("Successfully cancelled expired booking %s for package %s", booking.ID, booking.PackageID)
	}

	log.Printf("Auto-cancel completed: %d bookings cancelled", len(expiredBookings))
}

// StartAutoCancelScheduler - เริ่มตัวจับเวลาสำหรับยกเลิกอัตโนมัติ
func StartAutoCancelScheduler(db *gorm.DB) {
	log.Println("Starting auto-cancel scheduler...")
	
	// ทำงานทุก 1 นาที
	ticker := time.NewTicker(1 * time.Minute)
	
	go func() {
		for {
			select {
			case <-ticker.C:
				AutoCancelExpiredBookings(db)
			}
		}
	}()
	
	log.Println("Auto-cancel scheduler started (runs every 1 minute)")
}