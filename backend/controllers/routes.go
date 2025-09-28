package controllers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
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
	r.PUT("/api/user/role", func(c *gin.Context) {
		UpdateCurrentUserRoleHandler(c, db)
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
		GetAllBookingsHandler(c, db)
	})
	r.GET("/api/bookings/package/:packageId", func(c *gin.Context) {
		GetBookingsByPackageHandler(c, db)
	})

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

	r.GET("/greet", func(c *gin.Context) {
		greeting := "Hello from Supabase!"
		c.JSON(http.StatusOK, gin.H{"greeting": greeting})
	})

	fmt.Println("All routes setup completed!")
}