package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"trip-trader-backend/controllers"
	"trip-trader-backend/models"
	"trip-trader-backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	r := gin.Default()
	
	// Debug middleware
	r.Use(func(c *gin.Context) {
		fmt.Printf("[DEBUG] %s %s from %s\n", c.Request.Method, c.Request.URL.Path, c.ClientIP())
		c.Next()
	})

	// CORS configuration สำหรับ frontend - อนุญาตทุก origin สำหรับ debug
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true, // Allow all origins for debugging
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"}, // Allow all headers
		AllowCredentials: false, // Set to false when using AllowAllOrigins
	}))
	
	// โหลด .env อัตโนมัติ (ถ้ามี)
	_ = godotenv.Load()
	// ดึง connection string จาก env
	connStr := os.Getenv("SUPABASE_DB_URL")
	fmt.Println("connStr:", connStr)
	if connStr == "" {
		log.Fatal("SUPABASE_DB_URL env variable is not set")
	}

	
	// ตั้งค่า SQL logging สำหรับ GORM
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:              time.Second,
			LogLevel:                   logger.Info,
			IgnoreRecordNotFoundError: true,
			ParameterizedQueries:      false,
			Colorful:                  true,
		},
	)

	// เชื่อมต่อ PostgreSQL ด้วย GORM พร้อม SQL logging
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		log.Fatal("Unable to connect to database with GORM:", err)
	}

	// Auto migrate tables
	err = db.AutoMigrate(&models.UserRole{}, &models.TravelPackage{})
	if err != nil {
		log.Printf("Warning during migration: %v", err)
	}
	fmt.Println("Database migration completed")

	// Setup routes ผ่าน controllers package
	controllers.SetupRoutes(r, db)

	// เริ่ม Auto-Cancel Scheduler สำหรับยกเลิกการจองที่หมดเวลา
	services.StartAutoCancelScheduler(db)

	// ใช้ PORT จาก environment หรือ default 8000
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	
	fmt.Printf("Server starting on port %s\n", port)
	r.Run(":" + port)
}