package models

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	UserID      uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	DisplayName string    `json:"display_name" gorm:"type:text"`
	Phone       string    `json:"phone" gorm:"type:text"`
	Address     string    `json:"address" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at" gorm:"type:timestamp with time zone;autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"type:timestamp with time zone;autoUpdateTime"`
	
	User *User `json:"user,omitempty" gorm:"-"`
}
