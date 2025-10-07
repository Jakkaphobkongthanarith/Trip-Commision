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

	// Discount Code routes (แทน Promo Code)
	discountCodeController := NewDiscountCodeController(db)
	
	// Manager routes - จัดการ discount codes
	r.GET("/api/manager/discount-codes", discountCodeController.GetAllDiscountCodes)
	r.GET("/api/manager/packages", discountCodeController.GetAllPackages)
	r.PUT("/api/discount-codes/:id/toggle", discountCodeController.ToggleDiscountCodeStatus)
	
	// Admin only - สร้างโค้ดส่วนลด
	r.POST("/api/discount-codes", discountCodeController.CreateDiscountCode)
	
	// Advertiser - ดูโค้ดของตัวเอง
	r.GET("/api/advertiser/:advertiser_id/discount-codes", discountCodeController.GetDiscountCodesByAdvertiser)
	
	// Advertiser - ดูค่าคอมมิชชั่น
	r.GET("/api/advertiser/:advertiser_id/commissions", discountCodeController.GetCommissionsByAdvertiser)
	
	// Public - ตรวจสอบความถูกต้องของโค้ด
	r.POST("/api/discount-codes/validate", discountCodeController.ValidateDiscountCode)
	
	// Booking - ใช้โค้ดส่วนลด (internal)
	r.POST("/api/discount-codes/use", discountCodeController.UseDiscountCode)

	r.GET("/greet", func(c *gin.Context) {
		greeting := "Hello from Supabase!"
		c.JSON(http.StatusOK, gin.H{"greeting": greeting})
	})

	fmt.Println("All routes setup completed!")
}