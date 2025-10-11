package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Middleware เพื่อใส่ db instance ใน context
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	// Travel Package routes
	r.GET("/allPackages", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	// เพิ่ม REST API routes ที่ Frontend ต้องการ
	r.GET("/api/travel-packages", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	r.POST("/api/travel-packages", func(c *gin.Context) {
		CreatePackageHandler(c, db)
	})
	r.PUT("/api/travel-packages/:id", func(c *gin.Context) {
		// TODO: สร้าง UpdatePackageHandler
		GetAllPackagesHandler(c, db)
	})
	r.GET("/package/:id", func(c *gin.Context) {
		GetPackageByIDHandler(c, db)
	})
	r.POST("/meow", func(c *gin.Context) {
		CreatePackageHandler(c, db)
	})
	r.PUT("/package/:id/bookings", func(c *gin.Context) {
		UpdateCurrentBookingsHandler(c, db)
	})
	r.GET("/package/userList/:packageId", func(c *gin.Context) {
		GetPackageConfirmedUsersHandler(c, db)
	})
	
	// Package-Advertiser management routes
	r.PUT("/api/package/:id/advertisers", func(c *gin.Context) {
		UpdatePackageAdvertisersHandler(c, db)
	})
	r.GET("/api/package/:id/advertisers", func(c *gin.Context) {
		GetPackageAdvertisersHandler(c, db)
	})
	r.DELETE("/api/travel-packages/:id", func(c *gin.Context) {
		DeletePackageHandler(c, db)
	})

	// Profile/User routes (สำหรับ profiles table)
	r.GET("/api/profiles", func(c *gin.Context) {
		GetAllProfilesHandler(c, db)
	})
	r.GET("/api/profile/:userId", func(c *gin.Context) {
		GetProfileByUserIdHandler(c, db)
	})

	// Members/Users management
	r.GET("/api/users", func(c *gin.Context) {
		GetAllUsersHandler(c, db)
	})
	r.GET("/api/user/current/role", func(c *gin.Context) {
		GetCurrentUserRoleHandler(c, db)
	})

	r.PUT("/api/user/:userId/role", func(c *gin.Context) {
		UpdateUserRoleHandler(c, db)
	})

	// Commissions management
	r.GET("/api/commissions", func(c *gin.Context) {
		GetCommissionsHandler(c, db)
	})

	// Bookings routes
	r.GET("/api/bookings", func(c *gin.Context) {
		// รองรับทั้ง query parameter และ path parameter
		packageID := c.Query("package_id")
		if packageID != "" {
			// ถ้ามี package_id ใน query parameter ให้แสดงเฉพาะของ package นั้น
			GetBookingsByPackageQueryHandler(c, db)
		} else {
			// ถ้าไม่มี package_id ให้แสดงทั้งหมด
			GetAllBookingsHandler(c, db)
		}
	})
	r.GET("/api/bookings/package/:packageId", func(c *gin.Context) {
		GetBookingsByPackageHandler(c, db)
	})
	
	// Protected booking routes (require authentication)
	authorized := r.Group("/")
	authorized.Use(AuthMiddleware())
	{
		authorized.POST("/api/booking/payment", func(c *gin.Context) {
			CreateBookingPaymentHandler(c, db)
		})
		authorized.PUT("/api/booking/:bookingId/confirm-payment", func(c *gin.Context) {
			ConfirmPaymentHandler(c, db)
		})
	}

	// Reviews routes
	r.GET("/api/reviews", func(c *gin.Context) {
		GetReviewsHandler(c, db)
	})
	r.GET("/api/reviews/package/:packageId", func(c *gin.Context) {
		GetReviewsByPackageHandler(c, db)
	})

	// Auth routes
	r.POST("/api/signup", SignupHandler)
	r.POST("/api/login", LoginHandler)
	r.POST("/api/logout", LogoutHandler)

	// Test routes
	r.GET("/meow", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": "abc"})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// Discount Code routes (Advertiser-based และ Global codes)
	discountCodeController := NewDiscountCodeController(db)
	
	// Manager routes - จัดการ discount codes
	r.GET("/api/manager/discount-codes", discountCodeController.GetAllDiscountCodes)
	r.GET("/api/manager/global-discount-codes", discountCodeController.GetAllGlobalDiscountCodes)
	r.GET("/api/manager/advertisers", discountCodeController.GetAllAdvertisers)
	r.PUT("/api/discount-codes/:id/toggle", discountCodeController.ToggleDiscountCodeStatus)
	r.PUT("/api/global-discount-codes/:id/toggle", discountCodeController.ToggleGlobalDiscountCodeStatus)
	
	// Manager only - สร้างโค้ดส่วนลด
	r.POST("/api/discount-codes/advertiser", discountCodeController.CreateDiscountCodeForAdvertiser)
	r.POST("/api/global-discount-codes", discountCodeController.CreateGlobalDiscountCode)
	
	// Advertiser - ดูโค้ดของตัวเอง
	r.GET("/api/advertiser/:advertiser_id/discount-codes", discountCodeController.GetDiscountCodesByAdvertiser)
	
	// Advertiser - ดูค่าคอมมิชชั่น
	r.GET("/api/advertiser/:advertiser_id/commissions", discountCodeController.GetCommissionsByAdvertiser)
	
	// Public - ตรวจสอบความถูกต้องของโค้ด
	r.POST("/api/discount-codes/validate", discountCodeController.ValidateDiscountCode)
	
	// Booking - ใช้โค้ดส่วนลด (internal)
	r.POST("/api/discount-codes/use", discountCodeController.UseDiscountCode)
	
	// Manager - ลบโค้ดส่วนลด
	r.DELETE("/api/discount-codes/:id", discountCodeController.DeleteDiscountCode)
	r.DELETE("/api/global-discount-codes/:id", discountCodeController.DeleteGlobalDiscountCode)

	// Notification routes
	notificationController := NewNotificationController(db)
	
	// สร้าง notification สำหรับผู้ใช้คนเดียว
	r.POST("/api/notifications", notificationController.CreateNotification)
	
	// ส่ง notification ให้ผู้ใช้ทั้งหมด (broadcast)
	r.POST("/api/notifications/broadcast", notificationController.BroadcastNotification)
	
	// สร้าง test notifications
	r.POST("/api/notifications/test", notificationController.CreateTestNotifications)
	
	// ดึง notifications ของผู้ใช้
	r.GET("/api/notifications/user/:user_id", notificationController.GetUserNotifications)
	
	// ทำเครื่องหมาย notification ว่าอ่านแล้ว
	r.PUT("/api/notifications/:id/read", notificationController.MarkAsRead)
	
	// ทำเครื่องหมาย notifications ทั้งหมดของผู้ใช้ว่าอ่านแล้ว
	r.PUT("/api/notifications/user/:user_id/read-all", notificationController.MarkAllAsRead)
	
	// ลบ notification
	r.DELETE("/api/notifications/:id", notificationController.DeleteNotification)
	
	// นับจำนวน notifications ที่ยังไม่ได้อ่าน
	r.GET("/api/notifications/user/:user_id/unread-count", notificationController.GetUnreadCount)

	r.GET("/greet", func(c *gin.Context) {
		greeting := "Hello from Supabase!"
		c.JSON(http.StatusOK, gin.H{"greeting": greeting})
	})

	fmt.Println("All routes setup completed!")
}