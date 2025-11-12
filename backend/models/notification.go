package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// JSONMap for storing arbitrary JSON data
type JSONMap map[string]interface{}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSONMap)
		return nil
	}
	
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		*j = make(JSONMap)
		return nil
	}
	
	if len(bytes) == 0 {
		*j = make(JSONMap)
		return nil
	}
	
	return json.Unmarshal(bytes, j)
}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

type Notification struct {
	ID        uuid.UUID  `json:"id" gorm:"column:id;type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID  `json:"user_id" gorm:"column:user_id;type:uuid;not null"`
	Title     string     `json:"title" gorm:"column:title;type:text;not null"`
	Message   string     `json:"message" gorm:"column:message;type:text;not null"`
	Type      string     `json:"type" gorm:"column:type;type:text;not null;default:info"`
	Category  string     `json:"category" gorm:"column:category;type:text;default:info"`
	Priority  int        `json:"priority" gorm:"column:priority;type:integer;default:2"`
	ActionURL string     `json:"action_url" gorm:"column:action_url;type:text"`
	ImageURL  string     `json:"image_url" gorm:"column:image_url;type:text"`
	Data      JSONMap    `json:"data" gorm:"-"`
	IsRead    bool       `json:"is_read" gorm:"column:is_read;type:boolean;not null;default:false"`
	ExpiresAt *time.Time `json:"expires_at" gorm:"column:expires_at;type:timestamp with time zone"`
	CreatedAt time.Time  `json:"created_at" gorm:"column:created_at;type:timestamp with time zone;not null;default:now()"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"column:updated_at;type:timestamp with time zone;not null;default:now()"`

	User *Profile `json:"user,omitempty" gorm:"-"`
}

func (Notification) TableName() string {
	return "notifications"
}