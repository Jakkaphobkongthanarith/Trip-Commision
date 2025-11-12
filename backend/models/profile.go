package models

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email       string    `json:"email" gorm:"type:text;unique;not null"`
	Password    string    `json:"-" gorm:"type:text;not null"`
	DisplayName string    `json:"display_name" gorm:"type:text"`
	Phone       string    `json:"phone" gorm:"type:text"`
	Address     string    `json:"address" gorm:"type:text"`
	UserRole    string    `json:"user_role" gorm:"type:text;default:'customer'"`
	DisplayID   int       `json:"display_id" gorm:"autoIncrement;unique"`
	CreatedAt   time.Time `json:"created_at" gorm:"type:timestamp with time zone;autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"type:timestamp with time zone;autoUpdateTime"`
}

func (Profile) TableName() string {
	return "public.profiles"
}
