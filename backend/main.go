package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"trip-trader-backend/controllers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	r := gin.Default()
	
	// CORS configuration สำหรับ frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "http://localhost:4173", "http://localhost:8001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))
	
	// โหลด .env อัตโนมัติ (ถ้ามี)
	_ = godotenv.Load()
	// ดึง connection string จาก env
	connStr := os.Getenv("SUPABASE_DB_URL")
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


	// Setup routes ผ่าน controllers package
	controllers.SetupRoutes(r, db)

	// ตัวอย่าง greeting (mock)
	greeting := "Hello from Supabase!"
	fmt.Println(greeting)

	// ใช้ PORT จาก environment หรือ default 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	fmt.Printf("Server starting on port %s\n", port)
	r.Run(":" + port)
}