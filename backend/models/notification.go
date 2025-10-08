package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID `json:"id" gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"column:user_id;type:uuid;not null"` 
	Title     string    `json:"title" gorm:"column:title;type:text;not null"` // เพิ่ม column tag
	Message   string    `json:"message" gorm:"column:message;type:text;not null"`
	Type      string    `json:"type" gorm:"column:type;type:text;not null;default:info"` 
	IsRead    bool      `json:"is_read" gorm:"column:is_read;type:boolean;not null;default:false"`
	CreatedAt time.Time `json:"created_at" gorm:"column:created_at;type:timestamp with time zone;not null;default:now()"`
	UpdatedAt time.Time `json:"updated_at" gorm:"column:updated_at;type:timestamp with time zone;not null;default:now()"`

	// Foreign key relationships (ไม่มี CASCADE constraint ใน schema ที่มีอยู่)
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName กำหนดชื่อ table
func (Notification) TableName() string {
	return "notifications"
}