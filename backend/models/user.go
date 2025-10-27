package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// JSONMap is a custom type for handling JSON data from database
type JSONMap map[string]interface{}

// Scan implements the Scanner interface for database scanning
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

// Value implements the driver Valuer interface for database writing
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// User represents the auth.users table from Supabase
type User struct {
    ID                 uuid.UUID       `json:"id"`
    Email              string          `json:"email"`
    Phone              *string         `json:"phone"`
    EmailConfirmedAt   *time.Time      `json:"email_confirmed_at"`
    LastSignInAt       *time.Time      `json:"last_sign_in_at"`
	RawAppMetaData     JSONMap         `json:"raw_app_meta_data" gorm:"-"`
	RawUserMetaData    JSONMap         `json:"raw_user_meta_data" gorm:"-"`
    CreatedAt          time.Time       `json:"created_at"`
    UpdatedAt          time.Time       `json:"updated_at"`
    Role               *UserRole       `json:"role"`
    Profile            *Profile        `json:"profile"`
	AdvertisedPackages []TravelPackage `json:"advertised_packages,omitempty" gorm:"-"`
}

// UserRole represents the public.user_roles table
type UserRole struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null;uniqueIndex"`
	Role      string    `json:"role" gorm:"type:varchar(50);not null;default:'customer'"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamp with time zone;autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"type:timestamp with time zone;autoUpdateTime"`
}

// Role constants
const (
	RoleCustomer   = "customer"
	RoleAdvertiser = "advertiser"
	RoleManager    = "manager"
)

// ValidRoles returns slice of valid roles
func ValidRoles() []string {
	return []string{RoleCustomer, RoleAdvertiser, RoleManager}
}

// IsValidRole checks if role is valid
func IsValidRole(role string) bool {
	for _, validRole := range ValidRoles() {
		if role == validRole {
			return true
		}
	}
	return false
}

// TableName sets the table name for User model to auth.users
func (User) TableName() string {
	return "auth.users"
}

// TableName sets the table name for UserRole model to public.user_roles
func (UserRole) TableName() string {
	return "public.user_roles"
}