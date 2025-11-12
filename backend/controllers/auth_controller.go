package controllers

import (
	"net/http"
	"os"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// JWT Claims structure
type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Generate JWT token
func generateToken(userID, email, role string) (string, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-key-please-change-in-production"
	}

	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 24 hours
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

func SignupHandler(c *gin.Context) {
	var req struct {
		Email       string `json:"email" binding:"required"`
		Password    string `json:"password" binding:"required"`
		DisplayName string `json:"display_name"`
		Role        string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	// Set default role
	if req.Role == "" {
		req.Role = models.RoleCustomer
	}
	if !models.IsValidRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":       "invalid role",
			"valid_roles": models.ValidRoles(),
		})
		return
	}

	db := c.MustGet("db").(*gorm.DB)

	// Check if email already exists
	var existingProfile models.Profile
	if err := db.Where("email = ?", req.Email).First(&existingProfile).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Create profile
	profile := models.Profile{
		Email:       req.Email,
		Password:    string(hashedPassword),
		DisplayName: req.DisplayName,
		UserRole:    req.Role,
	}

	if err := db.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user", "details": err.Error()})
		return
	}

	// Generate JWT token
	token, err := generateToken(profile.ID.String(), profile.Email, profile.UserRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Return user data with token
	c.JSON(http.StatusOK, gin.H{
		"message":      "user created successfully",
		"access_token": token,
		"token":        token, // For backward compatibility
		"user": gin.H{
			"id":           profile.ID,
			"email":        profile.Email,
			"display_name": profile.DisplayName,
			"role":         profile.UserRole,
			"created_at":   profile.CreatedAt,
		},
	})
}

func LoginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request", "details": err.Error()})
		return
	}

	db := c.MustGet("db").(*gorm.DB)

	// Find user by email
	var profile models.Profile
	if err := db.Where("email = ?", req.Email).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(profile.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := generateToken(profile.ID.String(), profile.Email, profile.UserRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	// Return user data with token
	c.JSON(http.StatusOK, gin.H{
		"message":      "login successful",
		"access_token": token,
		"token":        token, // For backward compatibility
		"user": gin.H{
			"id":           profile.ID,
			"email":        profile.Email,
			"display_name": profile.DisplayName,
			"phone":        profile.Phone,
			"address":      profile.Address,
			"role":         profile.UserRole,
			"display_id":   profile.DisplayID,
		},
	})
}

func LogoutHandler(c *gin.Context) {
	// Since we're not using JWT tokens anymore, logout is client-side only
	c.JSON(http.StatusOK, gin.H{
		"message": "logged out successfully",
	})
}

func GetCurrentUserRoleHandler(c *gin.Context, db *gorm.DB) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "This endpoint is deprecated. Use session storage from login response instead.",
		"note":    "Please store user role from login API response in session storage and use it instead of calling this endpoint.",
	})
}