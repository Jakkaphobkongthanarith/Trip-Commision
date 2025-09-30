package controllers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func SignupHandler(c *gin.Context) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
		Role        string `json:"role"` // เพิ่ม role field
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// ตรวจสอบ role ว่าเป็นค่าที่ถูกต้องหรือไม่
	if req.Role == "" {
		req.Role = models.RoleCustomer // default เป็น customer
	}
	if !models.IsValidRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":       "invalid role",
			"valid_roles": models.ValidRoles(),
		})
		return
	}

	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseUrl == "" || supabaseKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Supabase env not set"})
		return
	}

	// สร้าง payload สำหรับ Supabase signup พร้อม role ใน metadata
	payload := map[string]interface{}{
		"email":    req.Email,
		"password": req.Password,
		"data": map[string]interface{}{
			"display_name": req.DisplayName,
			"role":         req.Role, // เพิ่ม role ใน user metadata
		},
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

	// ถ้า signup สำเร็จ ให้สร้าง user role ใน database
	if resp.StatusCode == http.StatusOK {
		var supabaseResp map[string]interface{}
		if err := json.Unmarshal(respBody, &supabaseResp); err == nil {
			if user, ok := supabaseResp["user"].(map[string]interface{}); ok {
				if userIdStr, ok := user["id"].(string); ok {
					userID, err := uuid.Parse(userIdStr)
					if err == nil {
						// สร้าง user role ใน database
						db := c.MustGet("db").(*gorm.DB)
						createUserRole(userID, req.Role, db)
					}
				}
			}
		}
	}

	c.Data(resp.StatusCode, "application/json", respBody)
}

// createUserRole สร้าง user role ใน database
func createUserRole(userID uuid.UUID, role string, db *gorm.DB) error {
	userRole := models.UserRole{
		UserID: userID,
		Role:   role,
	}
	return db.Create(&userRole).Error
}

func LoginHandler(c *gin.Context) {
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
		"email":    req.Email,
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

	// ถ้า login สำเร็จ ให้เพิ่ม role ใน response
	if resp.StatusCode == http.StatusOK {
		var loginResp map[string]interface{}
		if err := json.Unmarshal(respBody, &loginResp); err == nil {
			if user, ok := loginResp["user"].(map[string]interface{}); ok {
				if userIdStr, ok := user["id"].(string); ok {
					userID, err := uuid.Parse(userIdStr)
					if err == nil {
						// ดึง role จาก database
						db := c.MustGet("db").(*gorm.DB)
						var userRole models.UserRole
						if err := db.Where("user_id = ?", userID).First(&userRole).Error; err == nil {
							// เพิ่ม role ใน response
							loginResp["role"] = userRole.Role
							respBody, _ = json.Marshal(loginResp)
						}
					}
				}
			}
		}
	}

	c.Data(resp.StatusCode, "application/json", respBody)
}

func LogoutHandler(c *gin.Context) {
	var req struct {
		AccessToken string `json:"access_token"`
	}

	// ตรวจสอบ request format แต่ไม่บังคับ access_token
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Log logout attempt
	if req.AccessToken != "" {
		// มี token - อาจจะยัง valid อยู่
		// TODO: ในอนาคตอาจจะเพิ่ม token validation หรือ blacklist
		c.JSON(http.StatusOK, gin.H{
			"message":        "logged out successfully",
			"token_received": true,
		})
	} else {
		// ไม่มี token - session หมดอายุแล้วแต่ให้ logout สำเร็จ
		c.JSON(http.StatusOK, gin.H{
			"message":        "logged out successfully",
			"token_received": false,
		})
	}

	// ไม่เรียก Supabase API เพราะ:
	// 1. Token อาจหมดอายุแล้ว (จะได้ 403)
	// 2. Frontend จัดการ Supabase logout เอง
	// 3. Backend logout เป็นแค่ acknowledgment
}

// GetCurrentUserRoleHandler - deprecated, แนะนำให้ใช้ session storage จาก login response
func GetCurrentUserRoleHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "This endpoint is deprecated. Use session storage from login response instead.",
		"note": "Please store user role from login API response in session storage and use it instead of calling this endpoint.",
	})
}