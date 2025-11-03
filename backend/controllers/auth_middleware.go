package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SupabaseUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := tokenParts[1]
		
		
		userID, err := validateSupabaseToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		
		c.Set("user_id", userID)
		c.Next()
	}
}

func validateSupabaseToken(token string) (uuid.UUID, error) {
	supabaseUrl := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	if supabaseUrl == "" || supabaseKey == "" {
		return uuid.Nil, fmt.Errorf("supabase configuration missing")
	}

	
	req, err := http.NewRequest("GET", supabaseUrl+"/auth/v1/user", nil)
	if err != nil {
		return uuid.Nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("apikey", supabaseKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return uuid.Nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return uuid.Nil, fmt.Errorf("invalid token")
	}

	var user SupabaseUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return uuid.Nil, err
	}

	userUUID, err := uuid.Parse(user.ID)
	if err != nil {
		return uuid.Nil, err
	}

	return userUUID, nil
}