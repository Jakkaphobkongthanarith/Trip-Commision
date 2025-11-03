package main

import (
	"log"
	"os"
	"trip-trader-backend/controllers"

	// "trip-trader-backend/models"
	"trip-trader-backend/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Load .env for local dev
	_ = godotenv.Load(".env")

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	db, err := initDatabase()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	hub := utils.NewHub(db)
	go hub.Run()


	router := gin.Default()

	// CORS middleware (add production frontend domain)
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:8080",
			"http://localhost:8081",
			"http://localhost:3000",
			"https://trip-trader-production.up.railway.app",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
            "Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With",
        },
		AllowCredentials: true,
	}))

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "TripTrader Backend Running",
			"status":  "healthy",
			"database": "connected",
		})
	})

	controllers.SetupRoutes(router, db, hub)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Println("TripTrader Backend starting on port", port)
	 log.Println("Database: CONNECTED")
	log.Println("Frontend: http://localhost:8080")
	log.Printf("Backend API: http://localhost:%s", port)

	router.Run(":" + port)
}

func initDatabase() (*gorm.DB, error) {
	dbURL := os.Getenv("SUPABASE_DB_URL")
	log.Println("🔧 Initializing database connection...", dbURL)
	
	if dbURL != "" {
		maskedURL := dbURL
		if len(dbURL) > 40 {
			maskedURL = dbURL[:30] + "***MASKED***" + dbURL[len(dbURL)-20:]
		}
		log.Printf("Using connection string: %s", maskedURL)
	}

	if dbURL == "" {
		dbURL = "host=localhost user=postgres password=password dbname=trip_trader port=5432 sslmode=disable"
		 log.Println("Using fallback local database connection")
	}

	log.Println("🔄 Connecting to database...")
	db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		 log.Printf("Database connection failed: %v", err)
		return nil, err
	}

	log.Println("Database connected successfully")
	return db, nil
}