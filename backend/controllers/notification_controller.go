package controllers

import (
	"fmt"
	"net/http"
	"time"
	"trip-trader-backend/models"
	"trip-trader-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationController struct {
	db  *gorm.DB
	hub *utils.Hub // เพิ่ม WebSocket Hub
}

func NewNotificationController(db *gorm.DB, hub *utils.Hub) *NotificationController {
	return &NotificationController{
		db:  db,
		hub: hub,
	}
}

// สร้าง notification สำหรับ user คนเดียว
func (nc *NotificationController) CreateNotification(c *gin.Context) {
	type CreateNotificationRequest struct {
		UserID  string `json:"user_id" binding:"required"`
		Title   string `json:"title" binding:"required"`   
		Message string `json:"message" binding:"required"`
		Type    string `json:"type" binding:"required"`
		Data    map[string]interface{} `json:"data,omitempty"`
		Priority int   `json:"priority"`
	}

	var req CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Convert user_id string to UUID
	userUUID, err := uuid.Parse(req.UserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	// สร้าง notification ในฐานข้อมูล
	notification := models.Notification{
		UserID:  userUUID,
		Title:   req.Title,
		Message: req.Message,
		Type:    req.Type,
		IsRead:  false,
	}

	if err := nc.db.Create(&notification).Error; err != nil {
		fmt.Printf("Error creating notification: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create notification",
			"details": err.Error(),
		})
		return
	}

	// ส่งผ่าน WebSocket real-time
	if nc.hub != nil {
		wsMessage := utils.NotificationMessage{
			ID:       notification.ID.String(),
			UserID:   req.UserID,
			Type:     req.Type,
			Title:    req.Title,
			Message:  req.Message,
			Data:     req.Data,
			Priority: req.Priority,
		}
		nc.hub.SendToUser(req.UserID, wsMessage)
		fmt.Printf("📨 WebSocket notification sent to user %s\n", req.UserID)
	}

	c.JSON(http.StatusCreated, notification)
}

// CreateNotificationHelper - helper function สำหรับใช้ในส่วนอื่นของระบบ
func (nc *NotificationController) CreateNotificationHelper(userID, title, message, notifType string, data map[string]interface{}, priority int) error {
	// Convert user_id string to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID format: %v", err)
	}

	// สร้าง notification ในฐานข้อมูล
	notification := models.Notification{
		UserID:  userUUID,
		Title:   title,
		Message: message,
		Type:    notifType,
		IsRead:  false,
	}

	if err := nc.db.Create(&notification).Error; err != nil {
		return fmt.Errorf("failed to create notification: %v", err)
	}

	// ส่งผ่าน WebSocket real-time
	if nc.hub != nil {
		wsMessage := utils.NotificationMessage{
			ID:       notification.ID.String(),
			UserID:   userID,
			Type:     notifType,
			Title:    title,
			Message:  message,
			Data:     data,
			Priority: priority,
		}
		nc.hub.SendToUser(userID, wsMessage)
		fmt.Printf("📨 WebSocket notification sent to user %s: %s\n", userID, title)
	}

	return nil
}

// ส่ง notification ให้ผู้ใช้ทั้งหมด (broadcast)
func (nc *NotificationController) BroadcastNotification(c *gin.Context) {
	type BroadcastNotificationRequest struct {
		Title   string `json:"title" binding:"required"`   // เพิ่ม title field
		Message string `json:"message" binding:"required"`
		Type    string `json:"type" binding:"required"`
	}

	var req BroadcastNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// ดึงรายชื่อผู้ใช้ทั้งหมด
	var users []models.User
	if err := nc.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	// สร้าง notification สำหรับแต่ละผู้ใช้
	var notifications []models.Notification
	for _, user := range users {
		notification := models.Notification{
			UserID:  user.ID,   // ไม่ใช้ pointer
			Title:   req.Title, // เพิ่ม title
			Message: req.Message,
			Type:    req.Type,
			IsRead:  false,
		}
		fmt.Printf("Creating notification with Title: '%s', Message: '%s'\n", notification.Title, notification.Message)
		notifications = append(notifications, notification)
	}

	// Batch create notifications (แก้ไขเป็นการสร้างทีละตัว)
	var createdNotifications []models.Notification
	for _, notification := range notifications {
		if err := nc.db.Create(&notification).Error; err != nil {
			fmt.Printf("Error creating individual notification: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create broadcast notifications",
				"details": err.Error(),
			})
			return
		}
		createdNotifications = append(createdNotifications, notification)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Broadcast notification sent successfully",
		"count":   len(createdNotifications),
	})
}

// ดึง notifications ของผู้ใช้
func (nc *NotificationController) GetUserNotifications(c *gin.Context) {
	userID := c.Param("user_id")

	// Convert user_id string to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	var notifications []models.Notification
	if err := nc.db.Where("user_id = ?", userUUID).
		Order("created_at DESC").
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notifications"})
		return
	}

	c.JSON(http.StatusOK, notifications)
}

// ทำเครื่องหมาย notification ว่าอ่านแล้ว
func (nc *NotificationController) MarkAsRead(c *gin.Context) {
	notificationID := c.Param("id")

	// Convert notification_id string to UUID
	notificationUUID, err := uuid.Parse(notificationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID format"})
		return
	}

	if err := nc.db.Model(&models.Notification{}).
		Where("id = ?", notificationUUID).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// ทำเครื่องหมาย notifications ทั้งหมดของผู้ใช้ว่าอ่านแล้ว
func (nc *NotificationController) MarkAllAsRead(c *gin.Context) {
	userID := c.Param("user_id")

	// Convert user_id string to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	if err := nc.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userUUID, false).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// ลบ notification
func (nc *NotificationController) DeleteNotification(c *gin.Context) {
	notificationID := c.Param("id")

	// Convert notification_id string to UUID
	notificationUUID, err := uuid.Parse(notificationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID format"})
		return
	}

	if err := nc.db.Where("id = ?", notificationUUID).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted successfully"})
}

// WebSocketHandler - endpoint สำหรับ WebSocket connection
func (nc *NotificationController) WebSocketHandler(c *gin.Context) {
	if nc.hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "WebSocket hub not initialized"})
		return
	}
	nc.hub.HandleWebSocket(c)
}

// GetConnectedUsers - ดู users ที่ online
func (nc *NotificationController) GetConnectedUsers(c *gin.Context) {
	if nc.hub == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "WebSocket hub not initialized"})
		return
	}
	
	users := nc.hub.GetConnectedUsers()
	c.JSON(http.StatusOK, gin.H{
		"connected_users": users,
		"total": len(users),
	})
}

// Test endpoint สำหรับทดสอบ WebSocket notification
func (nc *NotificationController) TestNotification(c *gin.Context) {
	type TestNotificationRequest struct {
		UserID  string `json:"user_id" binding:"required"`
		Title   string `json:"title"`
		Message string `json:"message"`
	}

	var req TestNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Set default values if not provided
	if req.Title == "" {
		req.Title = "Test WebSocket Notification"
	}
	if req.Message == "" {
		req.Message = "This is a test notification sent via WebSocket!"
	}

	// ส่งผ่าน WebSocket Hub โดยไม่บันทึกลงฐานข้อมูล
	nc.hub.SendToUser(req.UserID, utils.NotificationMessage{
		ID:        uuid.New().String(),
		UserID:    req.UserID,
		Type:      "notification",
		Title:     req.Title,
		Message:   req.Message,
		Priority:  2,
		Timestamp: time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Test notification sent via WebSocket",
		"user_id": req.UserID,
		"title":   req.Title,
	})
}