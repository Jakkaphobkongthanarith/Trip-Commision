package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type DiscountCode struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code         string     `json:"code" gorm:"type:text;unique;not null"`
	AdvertiserID uuid.UUID  `json:"advertiser_id" gorm:"type:uuid;not null"`
	PackageID    uuid.UUID  `json:"package_id" gorm:"type:uuid;not null"`
	DiscountValue float64 `json:"discount_value" gorm:"type:numeric(10,2);not null"`
	DiscountType  string  `json:"discount_type" gorm:"type:text;not null;default:percentage"`
	CommissionRate float64   `json:"commission_rate" gorm:"type:numeric(5,2);default:5.00"`
	MaxUses        *int      `json:"max_uses" gorm:"type:integer"`
	CurrentUses    int       `json:"current_uses" gorm:"type:integer;default:0"`
	IsActive       *bool     `json:"is_active" gorm:"type:boolean;default:true"`
	ExpiresAt      *time.Time `json:"expires_at" gorm:"type:timestamp with time zone"`
	CreatedAt      time.Time `json:"created_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	
	Advertiser User          `json:"advertiser,omitempty" gorm:"-"`
	Package    TravelPackage `json:"package,omitempty" gorm:"foreignKey:PackageID"`
}

func (DiscountCode) TableName() string {
	return "discount_codes"
}

type GlobalDiscountCode struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code          string     `json:"code" gorm:"unique;not null"`
	DiscountValue float64    `json:"discount_value" gorm:"type:numeric(10,2);not null"`
	DiscountType  string     `json:"discount_type" gorm:"type:text;not null;default:percentage"`
	MaxUses       *int       `json:"max_uses" gorm:"type:integer"`
	CurrentUses   int        `json:"current_uses" gorm:"type:integer;default:0"`
	IsActive      bool       `json:"is_active" gorm:"default:true"`
	ExpiresAt     *time.Time `json:"expires_at" gorm:"type:timestamp with time zone"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func (GlobalDiscountCode) TableName() string {
	return "global_discount_codes"
}

type Commission struct {
	ID                   uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BookingID            uuid.UUID  `json:"booking_id" gorm:"type:uuid;not null"`
	AdvertiserID         uuid.UUID  `json:"advertiser_id" gorm:"type:uuid;not null"`
	DiscountCodeID       *uuid.UUID `json:"discount_code_id" gorm:"type:uuid"`
	CommissionAmount     float64    `json:"commission_amount" gorm:"type:numeric(10,2);not null"`
	CommissionPercentage float64    `json:"commission_percentage" gorm:"type:numeric(5,2);not null;default:5.00"` // % ค่าคอมมิชชั่น
	Status               string     `json:"status" gorm:"type:text;not null;default:pending"`
	PaidAt               *time.Time `json:"paid_at" gorm:"type:timestamp with time zone"`
	CreatedAt            time.Time  `json:"created_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	UpdatedAt            time.Time  `json:"updated_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	
	Advertiser   User         `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID"`
	Booking      Booking      `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
	DiscountCode DiscountCode `json:"discount_code,omitempty" gorm:"foreignKey:DiscountCodeID"`
}

func (Commission) TableName() string {
	return "commissions"
}

func GenerateDiscountCode(advertiserName string, discountValue float64) string {
	prefix := ""
	if len(advertiserName) >= 3 {
		prefix = advertiserName[:3]
	} else {
		prefix = advertiserName
	}
	
	prefix = strings.ToUpper(strings.ReplaceAll(prefix, " ", ""))
	
	randomSuffix := uuid.New().String()[:4]
	return fmt.Sprintf("%s%d%s", prefix, int(discountValue), strings.ToUpper(randomSuffix))
}

func GenerateGlobalDiscountCode(discountValue float64) string {
	randomSuffix := uuid.New().String()[:6]
	return fmt.Sprintf("GLOBAL%d%s", int(discountValue), strings.ToUpper(randomSuffix))
}

func (dc *DiscountCode) IsValidForUse() bool {
	if dc.IsActive == nil {
		return false
	}
	if !*dc.IsActive {
		return false
	}
	if dc.MaxUses != nil && dc.CurrentUses >= *dc.MaxUses {
		return false
	}
	if dc.ExpiresAt != nil && time.Now().After(*dc.ExpiresAt) {
		return false
	}
	return true
}

func (dc *DiscountCode) IsValidForPackage(packageID uuid.UUID) bool {
	return dc.PackageID == packageID && dc.IsValidForUse()
}

func (gdc *GlobalDiscountCode) IsValidForUse() bool {
	if !gdc.IsActive {
		return false
	}
	if gdc.ExpiresAt != nil && time.Now().After(*gdc.ExpiresAt) {
		return false
	}
	return true
}