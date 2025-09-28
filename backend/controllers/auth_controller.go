package controllers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func SignupHandler(c *gin.Context) {
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
            "message": "logged out successfully",
            "token_received": true,
        })
    } else {
        // ไม่มี token - session หมดอายุแล้วแต่ให้ logout สำเร็จ
        c.JSON(http.StatusOK, gin.H{
            "message": "logged out successfully", 
            "token_received": false,
        })
    }
    
    // ไม่เรียก Supabase API เพราะ:
    // 1. Token อาจหมดอายุแล้ว (จะได้ 403)
    // 2. Frontend จัดการ Supabase logout เอง
    // 3. Backend logout เป็นแค่ acknowledgment
}