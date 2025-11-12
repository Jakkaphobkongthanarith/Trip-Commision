package models

// User และ UserRole models ไม่ใช้แล้ว - ย้ายทุกอย่างไป public.profiles

/*
import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

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

type UserRole struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null;uniqueIndex"`
	Role      string    `json:"role" gorm:"type:varchar(50);not null;default:'customer'"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamp with time zone;autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"type:timestamp with time zone;autoUpdateTime"`
}

func (User) TableName() string {
	return "auth.users"
}

func (UserRole) TableName() string {
	return "public.user_roles"
}
*/

// Constants สำหรับ roles - ย้ายไว้ใน models แล้ว ใช้ร่วมกันได้
const (
	RoleCustomer   = "customer"
	RoleAdvertiser = "advertiser"
	RoleManager    = "manager"
)

func ValidRoles() []string {
	return []string{RoleCustomer, RoleAdvertiser, RoleManager}
}

func IsValidRole(role string) bool {
	for _, validRole := range ValidRoles() {
		if role == validRole {
			return true
		}
	}
	return false
}