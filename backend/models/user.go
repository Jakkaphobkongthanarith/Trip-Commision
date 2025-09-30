package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents the auth.users table from Supabase
type User struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	Email       string     `json:"email" gorm:"type:varchar(255);uniqueIndex;not null"`
	Phone       *string    `json:"phone" gorm:"type:varchar(15)"`
	EmailConfirmedAt *time.Time `json:"email_confirmed_at" gorm:"type:timestamp with time zone"`
	LastSignInAt *time.Time `json:"last_sign_in_at" gorm:"type:timestamp with time zone"`
	RawAppMetaData map[string]interface{} `json:"raw_app_meta_data" gorm:"type:jsonb"`
	RawUserMetaData map[string]interface{} `json:"raw_user_meta_data" gorm:"type:jsonb"`
	CreatedAt   time.Time  `json:"created_at" gorm:"type:timestamp with time zone"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"type:timestamp with time zone"`
	Role        *UserRole  `json:"role" gorm:"foreignKey:UserID;references:ID"`
	Profile     *Profile   `json:"profile" gorm:"foreignKey:UserID;references:ID"`
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