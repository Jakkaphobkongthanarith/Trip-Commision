package services

import (
	"log"
	"time"
	"trip-trader-backend/models"

	"gorm.io/gorm"
)

func AutoCancelExpiredBookings(db *gorm.DB) {
	log.Printf("[AUTO-CANCEL] Starting expired bookings check at %v", time.Now())

	var expiredBookings []models.Booking
	currentTime := time.Now()
	log.Printf("[AUTO-CANCEL] Searching for bookings with expires_at < %v AND payment_status = 'pending' AND status = 'pending'", currentTime)
	
	result := db.Where("expires_at < ? AND payment_status = ? AND status = ?", 
		currentTime, "pending", "pending").Find(&expiredBookings)

	log.Printf("[AUTO-CANCEL] Query executed. Found %d bookings. Error: %v", len(expiredBookings), result.Error)

	if result.Error != nil {
		log.Printf("[AUTO-CANCEL] Error fetching expired bookings: %v", result.Error)
		return
	}

	if len(expiredBookings) == 0 {
		log.Println("[AUTO-CANCEL] No expired bookings found")
		return
	}

	log.Printf("Found %d expired bookings to cancel", len(expiredBookings))

	for i, booking := range expiredBookings {
		log.Printf("[AUTO-CANCEL] Processing booking %d/%d: ID=%s, Expires=%v, Package=%s, Guests=%d", 
			i+1, len(expiredBookings), booking.ID, booking.ExpiresAt, booking.PackageID, booking.GuestCount)
		
		updateResult := db.Model(&booking).Updates(map[string]interface{}{
			"status":         "cancelled",
			"payment_status": "failed",
			"updated_at":     time.Now(),
		})

		if updateResult.Error != nil {
			log.Printf("[AUTO-CANCEL] Error cancelling booking %s: %v", booking.ID, updateResult.Error)
			continue
		}
		log.Printf("[AUTO-CANCEL] Booking %s status updated to cancelled", booking.ID)

		packageUpdateResult := db.Model(&models.TravelPackage{}).
			Where("id = ?", booking.PackageID).
			Update("current_bookings", gorm.Expr("current_bookings - ?", booking.GuestCount))

		if packageUpdateResult.Error != nil {
			log.Printf("[AUTO-CANCEL] Error updating package bookings for booking %s: %v", booking.ID, packageUpdateResult.Error)
		} else {
			log.Printf("[AUTO-CANCEL] Package %s current_bookings decreased by %d", booking.PackageID, booking.GuestCount)
		}

		log.Printf("[AUTO-CANCEL] Successfully cancelled expired booking %s for package %s", booking.ID, booking.PackageID)
	}

	log.Printf("Auto-cancel completed: %d bookings cancelled", len(expiredBookings))
}

func StartAutoCancelScheduler(db *gorm.DB) {
	log.Println("Starting auto-cancel scheduler...")
	
	ticker := time.NewTicker(1 * time.Minute)
	
	go func() {
		defer ticker.Stop()
		log.Println("[AUTO-CANCEL] Goroutine started successfully")
		for range ticker.C {
			log.Println("[AUTO-CANCEL] Ticker triggered, calling AutoCancelExpiredBookings...")
			AutoCancelExpiredBookings(db)
			log.Println("[AUTO-CANCEL] AutoCancelExpiredBookings completed")
		}
	}()
	
	log.Println("Auto-cancel scheduler started (runs every 1 minute)")
}