package controllers

import (
	"fmt"
	"net/http"
	"trip-trader-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, hub *utils.Hub) {
	// Get all packages for a given advertiser
	r.GET("/api/advertiser/:advertiser_id/packages", func(c *gin.Context) {
		GetAdvertiserPackagesHandler(c, db)
	})
	r.Use(func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	})

	r.GET("/allPackages", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	r.GET("/api/travel-packages", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	r.GET("/api/packages", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	r.GET("/api/packages/tags", func(c *gin.Context) {
		GetAllTagsHandler(c, db)
	})
	
	// Inclusions routes
	r.GET("/api/inclusions", func(c *gin.Context) {
		GetAllInclusionsHandler(c, db)
	})
	r.POST("/api/inclusions", func(c *gin.Context) {
		CreateInclusionHandler(c, db)
	})
	r.GET("/api/packages/:id/inclusions", func(c *gin.Context) {
		GetPackageInclusionsHandler(c, db)
	})
	r.PUT("/api/packages/:id/inclusions", func(c *gin.Context) {
		UpdatePackageInclusionsHandler(c, db)
	})
	
	r.POST("/api/travel-packages", func(c *gin.Context) {
		CreatePackageHandler(c, db)
	})
	r.POST("/api/packages", func(c *gin.Context) {
		CreatePackageHandler(c, db)
	})
	r.PUT("/api/travel-packages/:id", func(c *gin.Context) {
		GetAllPackagesHandler(c, db)
	})
	r.PUT("/api/packages/:id", func(c *gin.Context) {
		UpdatePackageHandler(c, db)
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
	
	r.PUT("/api/package/:id/advertisers", func(c *gin.Context) {
		UpdatePackageAdvertisersHandler(c, db)
	})
	r.GET("/api/package/:id/advertisers", func(c *gin.Context) {
		GetPackageAdvertisersHandler(c, db)
	})
	r.DELETE("/api/travel-packages/:id", func(c *gin.Context) {
		DeletePackageHandler(c, db)
	})

	r.GET("/api/profiles", func(c *gin.Context) {
		GetAllProfilesHandler(c, db)
	})
	r.GET("/api/profile/:userId", func(c *gin.Context) {
		GetProfileByUserIdHandler(c, db)
	})
	r.PUT("/api/profile/:userId", func(c *gin.Context) {
		UpsertProfileHandler(c, db)
	})

	r.GET("/api/users", func(c *gin.Context) {
		GetAllUsersHandler(c, db)
	})
	r.GET("/api/user/current/role", func(c *gin.Context) {
		GetCurrentUserRoleHandler(c, db)
	})

	r.PUT("/api/user/:userId/role", func(c *gin.Context) {
		UpdateUserRoleHandler(c, db)
	})


	r.GET("/api/bookings", func(c *gin.Context) {
		packageID := c.Query("package_id")
		if packageID != "" {
			GetBookingsByPackageQueryHandler(c, db)
		} else {
			GetAllBookingsHandler(c, db)
		}
	})
	r.GET("/api/bookings/package/:packageId", func(c *gin.Context) {
		GetBookingsByPackageHandler(c, db)
	})
	
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


	r.POST("/api/signup", SignupHandler)
	r.POST("/api/login", LoginHandler)
	r.POST("/api/logout", LogoutHandler)

	r.GET("/meow", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": "a"})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	managerController := &ManagerController{DB: db}
	r.GET("/api/manager/dashboard/stats", managerController.GetDashboardStats)
	r.GET("/api/manager/recent-bookings", managerController.GetRecentBookings)
	r.GET("/api/manager/recent-packages", managerController.GetRecentPackages)
	r.GET("/api/manager/user-statistics", managerController.GetUserStatistics)
	r.GET("/api/manager/package-statistics", managerController.GetPackageStatistics)
	r.GET("/api/manager/monthly-booking-stats", managerController.GetMonthlyBookingStats)

	discountCodeController := NewDiscountCodeController(db)
	
	r.GET("/api/manager/discount-codes", discountCodeController.GetAllDiscountCodes)
	r.GET("/api/manager/global-discount-codes", discountCodeController.GetAllGlobalDiscountCodes)
	r.GET("/api/manager/advertisers", discountCodeController.GetAllAdvertisers)
	r.GET("/api/manager/packages", discountCodeController.GetAllPackages)
	r.PUT("/api/discount-codes/:id/toggle", discountCodeController.ToggleDiscountCodeStatus)
	r.PUT("/api/global-discount-codes/:id/toggle", discountCodeController.ToggleGlobalDiscountCodeStatus)
	
	r.POST("/api/discount-codes/advertiser", discountCodeController.CreateDiscountCodeForAdvertiser)
	r.POST("/api/global-discount-codes", discountCodeController.CreateGlobalDiscountCode)
	
	r.GET("/api/advertiser/:advertiser_id/discount-codes", discountCodeController.GetDiscountCodesByAdvertiser)
	
	r.GET("/api/advertiser/:advertiser_id/commissions", discountCodeController.GetCommissionsByAdvertiser)
	
	r.POST("/api/discount-codes/validate", discountCodeController.ValidateDiscountCode)
	
	r.POST("/api/discount-codes/use", discountCodeController.UseDiscountCode)
	
	r.DELETE("/api/discount-codes/:id", discountCodeController.DeleteDiscountCode)
	r.DELETE("/api/global-discount-codes/:id", discountCodeController.DeleteGlobalDiscountCode)

	notificationController := NewNotificationController(db, hub)
	
	r.GET("/ws", notificationController.WebSocketHandler)
	
	r.POST("/api/notifications", notificationController.CreateNotification)
	
	r.POST("/api/notifications/broadcast", notificationController.BroadcastNotification)
	
	r.PUT("/api/notifications/:id/read", notificationController.MarkAsRead)
	
	r.PUT("/api/notifications/user/:user_id/read-all", notificationController.MarkAllAsRead)
	
	r.DELETE("/api/notifications/:id", notificationController.DeleteNotification)
	
	r.POST("/api/test-notification", notificationController.TestNotification)

	r.GET("/greet", func(c *gin.Context) {
		greeting := "Hello from Supabase!"
		c.JSON(http.StatusOK, gin.H{"greeting": greeting})
	})

	fmt.Println("All routes setup completed!")
}