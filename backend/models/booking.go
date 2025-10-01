package models

import (
	"time"

	"github.com/google/uuid"
)

type Booking struct {
	ID                    uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CustomerID            uuid.UUID `json:"customer_id" gorm:"type:uuid;not null"`
	PackageID             uuid.UUID `json:"package_id" gorm:"type:uuid;not null"`
	GuestCount            int       `json:"guest_count" gorm:"not null;default:1"`
	BookingDate           string    `json:"booking_date" gorm:"type:date;not null"`
	TotalAmount           float64   `json:"total_amount" gorm:"type:numeric;not null"`
	DiscountAmount        float64   `json:"discount_amount" gorm:"type:numeric;default:0"`
	FinalAmount           float64   `json:"final_amount" gorm:"type:numeric;not null"`
	DiscountCodeID        *uuid.UUID `json:"discount_code_id" gorm:"type:uuid"`
	Status                string    `json:"status" gorm:"type:text;not null;default:'pending'"`
	PaymentStatus         string    `json:"payment_status" gorm:"type:text;default:'pending'"`
	StripePaymentIntentID *string   `json:"stripe_payment_intent_id" gorm:"type:text"`
	ContactName           string    `json:"contact_name" gorm:"type:text"`
	ContactPhone          string    `json:"contact_phone" gorm:"type:text"`
	ContactEmail          string    `json:"contact_email" gorm:"type:text"`
	SpecialRequests       *string   `json:"special_requests" gorm:"type:text"`
	CreatedAt             time.Time `json:"created_at" gorm:"type:timestamp with time zone;autoCreateTime"`
	UpdatedAt             time.Time `json:"updated_at" gorm:"type:timestamp with time zone;autoUpdateTime"`
}
