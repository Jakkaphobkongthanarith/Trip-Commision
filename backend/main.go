package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	r := gin.Default()

	// โหลด .env อัตโนมัติ (ถ้ามี)
	_ = godotenv.Load()
	// ดึง connection string จาก env
	connStr := os.Getenv("SUPABASE_DB_URL")
	if connStr == "" {
		log.Fatal("SUPABASE_DB_URL env variable is not set")
	}

	// เชื่อมต่อ PostgreSQL ด้วย GORM
	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
	if err != nil {
		log.Fatal("Unable to connect to database with GORM:", err)
	}


	// GORM Model struct (แก้ field ให้ตรงกับตาราง travel_packages จริง)
	type TravelPackage struct {
		ID          uint   `json:"id" gorm:"primaryKey"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Price       float64 `json:"price"`
		// เพิ่ม field อื่นๆ ตาม schema จริง
	}


	r.GET("/allPackages", func(c *gin.Context) {
		var packages []TravelPackage
		result := db.Find(&packages)
		if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
			return
		}
		c.JSON(http.StatusOK, packages)
	})

	// ตัวอย่าง greeting (mock)
	greeting := "Hello from Supabase!"
	fmt.Println(greeting)

	r.GET("/meow", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": "abc"})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	r.GET("/greet", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"greeting": greeting})
	})

	// --- Signup Proxy ---
	r.POST("/api/signup", func(c *gin.Context) {
		var req struct {
			Email       string `json:"email"`
			Password    string `json:"password"`
			DisplayName string `json:"display_name"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		supabaseUrl := os.Getenv("SUPABASE_URL")
		supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
		if supabaseUrl == "" || supabaseKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Supabase env not set"})
			return
		}

		// Prepare payload for Supabase Auth API
		payload := map[string]interface{}{
			"email": req.Email,
			"password": req.Password,
			"data": map[string]interface{}{ "display_name": req.DisplayName },
		}
		body, _ := json.Marshal(payload)

		supaReq, _ := http.NewRequest("POST", supabaseUrl+"/auth/v1/signup", bytes.NewBuffer(body))
		supaReq.Header.Set("apikey", supabaseKey)
		supaReq.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(supaReq)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "cannot reach Supabase"})
			return
		}
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, "application/json", respBody)
	})
	r.POST("/meow", func(c *gin.Context) {
    var pkg TravelPackage
    if err := c.ShouldBindJSON(&pkg); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
        return
    }
    result := db.Create(&pkg)
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
        return
    }
    c.JSON(http.StatusOK, pkg)
})

	// --- Login Proxy ---
	r.POST("/api/login", func(c *gin.Context) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		supabaseUrl := os.Getenv("SUPABASE_URL")
		supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
		if supabaseUrl == "" || supabaseKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Supabase env not set"})
			return
		}

		payload := map[string]interface{}{
			"email": req.Email,
			"password": req.Password,
		}
		body, _ := json.Marshal(payload)

		supaReq, _ := http.NewRequest("POST", supabaseUrl+"/auth/v1/token?grant_type=password", bytes.NewBuffer(body))
		supaReq.Header.Set("apikey", supabaseKey)
		supaReq.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(supaReq)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "cannot reach Supabase"})
			return
		}
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, "application/json", respBody)
	})

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
}