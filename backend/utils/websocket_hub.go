package utils

import (
	"log"
	"net/http"
	"sync"
	"time"
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin (adjust for production)
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type NotificationMessage struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"user_id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Priority  int                    `json:"priority"`
	Timestamp time.Time              `json:"timestamp"`
}

type Client struct {
	ID     string
	UserID string
	Conn   *websocket.Conn
	Send   chan NotificationMessage
	Hub    *Hub
}

type Hub struct {
	// Database instance
	db *gorm.DB

	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan NotificationMessage

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// User-based client mapping
	userClients map[string][]*Client

	mu sync.RWMutex
}

func NewHub(db *gorm.DB) *Hub {
	return &Hub{
		db:          db,
		broadcast:   make(chan NotificationMessage),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(map[*Client]bool),
		userClients: make(map[string][]*Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.userClients[client.UserID] = append(h.userClients[client.UserID], client)
			h.mu.Unlock()
			log.Printf("🔌 Client %s connected for user %s", client.ID, client.UserID)
			
			// เพิ่ม delay เล็กน้อยเพื่อให้ client connection พร้อม
			time.Sleep(100 * time.Millisecond)
			
			// ส่ง notifications เก่าให้ client ที่เพิ่งเชื่อมต่อ
			go h.sendExistingNotifications(client)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				
				// Remove from user clients
				if userClients, exists := h.userClients[client.UserID]; exists {
					for i, c := range userClients {
						if c.ID == client.ID {
							h.userClients[client.UserID] = append(userClients[:i], userClients[i+1:]...)
							break
						}
					}
					if len(h.userClients[client.UserID]) == 0 {
						delete(h.userClients, client.UserID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("🔌 Client %s disconnected for user %s", client.ID, client.UserID)

		case message := <-h.broadcast:
			h.mu.RLock()
			// Send to specific user
			if userClients, exists := h.userClients[message.UserID]; exists {
				for _, client := range userClients {
					select {
					case client.Send <- message:
						log.Printf("📨 Notification sent to user %s: %s", message.UserID, message.Title)
					default:
						close(client.Send)
						delete(h.clients, client)
						log.Printf("❌ Failed to send to client %s, removing", client.ID)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// SendToUser - ส่ง notification ไปยัง user เฉพาะ
func (h *Hub) SendToUser(userID string, notification NotificationMessage) {
	notification.UserID = userID
	notification.Timestamp = time.Now()
	if notification.ID == "" {
		notification.ID = uuid.New().String()
	}
	h.broadcast <- notification
}

// SendToAllUsers - ส่ง notification ไปยัง users ทั้งหมด
func (h *Hub) SendToAllUsers(notification NotificationMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	for userID := range h.userClients {
		notification.UserID = userID
		notification.Timestamp = time.Now()
		if notification.ID == "" {
			notification.ID = uuid.New().String()
		}
		h.broadcast <- notification
	}
}

// GetConnectedUsers - ดูว่ามี user ไหน online อยู่
func (h *Hub) GetConnectedUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	users := make([]string, 0, len(h.userClients))
	for userID := range h.userClients {
		users = append(users, userID)
	}
	return users
}

// sendExistingNotifications - ส่งข้อมูล notifications เก่าให้ client ที่เพิ่งเชื่อมต่อ
func (h *Hub) sendExistingNotifications(client *Client) {
	if h.db == nil {
		log.Println("⚠️ Database not available, skipping existing notifications")
		return
	}

	userUUID, err := uuid.Parse(client.UserID)
	if err != nil {
		log.Printf("❌ Invalid user UUID: %s", client.UserID)
		return
	}

	var notifications []models.Notification
	if err := h.db.Where("user_id = ?", userUUID).Order("created_at DESC").Limit(50).Find(&notifications).Error; err != nil {
		log.Printf("❌ Error fetching existing notifications for user %s: %v", client.UserID, err)
		return
	}

	log.Printf("📋 Sending %d existing notifications to user %s", len(notifications), client.UserID)

	// ส่ง notifications แต่ละตัวผ่าน WebSocket
	for _, notif := range notifications {
		message := NotificationMessage{
			ID:        notif.ID.String(),
			UserID:    client.UserID,
			Type:      "existing_notification", // ใช้ type พิเศษเพื่อบอกว่าเป็นข้อมูลเก่า
			Title:     notif.Title,
			Message:   notif.Message,
			Priority:  notif.Priority,
			Timestamp: notif.CreatedAt,
			Data: map[string]interface{}{
				"isRead": notif.IsRead,
			},
		}

		select {
		case client.Send <- message:
			// ส่งสำเร็จ
		default:
			log.Printf("⚠️ Failed to send existing notification to client %s", client.ID)
		}
	}

	// ส่ง unread count
	var unreadCount int64
	if err := h.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userUUID, false).Count(&unreadCount).Error; err == nil {
		countMessage := NotificationMessage{
			ID:        uuid.New().String(),
			UserID:    client.UserID,
			Type:      "unread_count",
			Title:     "Unread Count",
			Message:   "",
			Priority:  1,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"count": unreadCount,
			},
		}

		select {
		case client.Send <- countMessage:
			log.Printf("📊 Sent unread count (%d) to user %s", unreadCount, client.UserID)
		default:
			log.Printf("⚠️ Failed to send unread count to client %s", client.ID)
		}
	}
}

// HandleWebSocket - standalone function สำหรับ global hub instance
var globalHub *Hub

func init() {
	// globalHub จะถูกตั้งค่าใน main.go แทน
	// globalHub = NewHub(nil)
	// go globalHub.Run()
}

func HandleWebSocket(c *gin.Context) {
	globalHub.HandleWebSocket(c)
}

// HandleWebSocket - handle WebSocket connection
func (h *Hub) HandleWebSocket(c *gin.Context) {
	// รองรับทั้ง userID และ user_id
	userID := c.Query("userID")
	if userID == "" {
		userID = c.Query("user_id")
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userID or user_id is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		ID:     uuid.New().String(),
		UserID: userID,
		Conn:   conn,
		Send:   make(chan NotificationMessage, 256),
		Hub:    h,
	}

	h.register <- client

	// Start goroutines for handling the connection
	go h.writePump(client)
	go h.readPump(client)
}

func (h *Hub) writePump(client *Client) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteJSON(message); err != nil {
				log.Printf("❌ WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) readPump(client *Client) {
	defer func() {
		h.unregister <- client
		client.Conn.Close()
	}()

	client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket read error: %v", err)
			}
			break
		}
	}
}