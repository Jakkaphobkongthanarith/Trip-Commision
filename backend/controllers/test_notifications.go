// package controllers

// import (
// 	"net/http"
// 	"trip-trader-backend/models"

// 	"github.com/gin-gonic/gin"
// 	"github.com/google/uuid"
// )

// func (nc *NotificationController) CreateTestNotifications(c *gin.Context) {
// 	// สร้าง notifications ทดสอบ
// 	testNotifications := []models.Notification{
// 		{
// 			ID:          uuid.New(),
// 			UserID:      uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"), // Test user ID
// 			Title:       "🎉 ยินดีต้อนรับสู่ Trip Trader!",
// 			Message:     "ขอบคุณที่สมัครสมาชิกกับเรา เริ่มต้นการเดินทางของคุณได้เลย",
// 			Category:    "info",
// 			Priority:    2,
// 			ActionURL:   "/packages",
// 			ImageURL:    "https://example.com/welcome.jpg",
// 			IsRead:      false,
// 		},
// 		{
// 			ID:          uuid.New(),
// 			UserID:      uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"),
// 			Title:       "💳 การชำระเงินสำเร็จ!",
// 			Message:     "การจองแพคเกจ 'เที่ยวอยุธยา 2 วัน 1 คืน' เสร็จสมบูรณ์แล้ว",
// 			Category:    "payment",
// 			Priority:    1,
// 			ActionURL:   "/profile",
// 			IsRead:      false,
// 		},
// 		{
// 			ID:          uuid.New(),
// 			UserID:      uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"),
// 			Title:       "🎁 คุณได้รับส่วนลด 15%!",
// 			Message:     "ใช้โค้ด SAVE15 สำหรับการจองครั้งถัดไป วันหมดอายุ: 31 ธ.ค. 2024",
// 			Category:    "discount",
// 			Priority:    2,
// 			ActionURL:   "/advertiser",
// 			IsRead:      false,
// 		},
// 		{
// 			ID:          uuid.New(),
// 			UserID:      uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"),
// 			Title:       "💰 คอมมิชชั่น 450 บาท",
// 			Message:     "คุณได้รับคอมมิชชั่นจากการใช้โค้ด SUMMER20 จำนวน 450 บาท",
// 			Category:    "commission",
// 			Priority:    1,
// 			ActionURL:   "/advertiser",
// 			IsRead:      true,
// 		},
// 		{
// 			ID:          uuid.New(),
// 			UserID:      uuid.MustParse("123e4567-e89b-12d3-a456-426614174000"),
// 			Title:       "📅 เตือนการเดินทาง",
// 			Message:     "อีก 3 วันจะถึงวันเดินทางของคุณ โปรดเตรียมเอกสารให้พร้อม",
// 			Category:    "booking",
// 			Priority:    1,
// 			ActionURL:   "/profile",
// 			IsRead:      false,
// 		},
// 	}

// 	// บันทึกลง database
// 	for _, notification := range testNotifications {
// 		if err := nc.db.Create(&notification).Error; err != nil {
// 			c.JSON(http.StatusInternalServerError, gin.H{
// 				"error": "Failed to create test notification: " + err.Error(),
// 			})
// 			return
// 		}
// 	}

// 	c.JSON(http.StatusOK, gin.H{
// 		"message":             "Test notifications created successfully",
// 		"notifications_count": len(testNotifications),
// 		"test_user_id":        "123e4567-e89b-12d3-a456-426614174000",
// 	})
// }