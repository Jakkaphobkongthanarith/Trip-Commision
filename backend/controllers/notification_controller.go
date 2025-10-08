package controllers

import (
	"fmt"
	"net/http"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationController struct {
	db *gorm.DB
}

func NewNotificationController(db *gorm.DB) *NotificationController {
	return &NotificationController{db: db}
}

// สร้าง notification สำหรับ user คนเดียว
func (nc *NotificationController) CreateNotification(c *gin.Context) {
	type CreateNotificationRequest struct {
		UserID  string `json:"user_id" binding:"required"`
		Title   string `json:"title" binding:"required"`   // เพิ่ม title field
		Message string `json:"message" binding:"required"`
		Type    string `json:"type" binding:"required"`
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

	notification := models.Notification{
		UserID:  userUUID,  // ไม่ใช้ pointer เพราะ required ใน schema
		Title:   req.Title, // เพิ่ม title
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

	c.JSON(http.StatusCreated, notification)
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

// นับจำนวน notifications ที่ยังไม่ได้อ่าน
func (nc *NotificationController) GetUnreadCount(c *gin.Context) {
	userID := c.Param("user_id")

	// Convert user_id string to UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	var count int64
	if err := nc.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userUUID, false).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count unread notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}