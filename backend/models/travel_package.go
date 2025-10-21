package models

import (
	"time"

	"github.com/google/uuid"
)

type TravelPackage struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	ImageURL    string    `json:"image_url" gorm:"column:image_url"`
	Location    string    `json:"location"`
	Duration    int       `json:"duration"`
	MaxGuests        int       `json:"max_guests" gorm:"column:max_guests"`
	CurrentBookings  int       `json:"current_bookings" gorm:"column:current_bookings;default:0"` // ยังใช้อยู่
	AvailableFrom    *string   `json:"available_from" gorm:"column:available_from;type:date"`
	AvailableTo      *string   `json:"available_to" gorm:"column:available_to;type:date"`
	Tags             string    `json:"-" gorm:"column:tags"` // ไม่ส่งออกใน JSON โดยตรง
	TagsArray        []string  `json:"tags" gorm:"-"` // ส่งออกใน JSON แต่ไม่เก็บใน DB
	DiscountPercentage float64 `json:"discount_percentage" gorm:"column:discount_percentage;default:0"`
	AdvertiserID     *uuid.UUID `json:"advertiser_id" gorm:"column:advertiser_id;type:uuid"` // ยังใช้อยู่ (backward compatibility)
	IsActive         *bool     `json:"is_active" gorm:"column:is_active;type:boolean;default:true"`
	DisplayID        int       `json:"display_id" gorm:"column:display_id;uniqueIndex"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	
	// Computed fields (จะคำนวณ real-time แทน stored values) - REMOVED
	// AverageRating and ReviewCount features removed
	AdvertiserNames  string  `json:"advertiser_names" gorm:"-"` // จะรวมจาก profiles
	
	// Relationships - Reviews relationship removed
	Advertisers []User    `json:"advertisers,omitempty" gorm:"many2many:package_advertisers;joinForeignKey:travel_package_id;joinReferences:advertiser_id;"`
	Advertiser  *User     `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID;references:ID"`
	Bookings    []Booking `json:"bookings,omitempty" gorm:"foreignKey:PackageID"`
}

// Junction table for package-advertiser relationship
type PackageAdvertiser struct {
	TravelPackageID uuid.UUID `json:"travel_package_id" gorm:"column:travel_package_id;type:uuid;primaryKey"`
	AdvertiserID    uuid.UUID `json:"advertiser_id" gorm:"column:advertiser_id;type:uuid;primaryKey"`
}
