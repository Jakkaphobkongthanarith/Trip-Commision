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
	CurrentBookings  int       `json:"current_bookings" gorm:"column:current_bookings;default:0"`
	AvailableFrom    *string   `json:"available_from" gorm:"column:available_from;type:date"`
	AvailableTo      *string   `json:"available_to" gorm:"column:available_to;type:date"`
	Tags             string    `json:"-" gorm:"column:tags"`
	TagsArray        []string  `json:"tags" gorm:"-"`
	DiscountPercentage float64 `json:"discount_percentage" gorm:"column:discount_percentage;default:0"`
	AdvertiserID     *uuid.UUID `json:"advertiser_id" gorm:"column:advertiser_id;type:uuid"`
	IsActive         *bool     `json:"is_active" gorm:"column:is_active;type:boolean;default:true"`
	DisplayID        int       `json:"display_id" gorm:"column:display_id;uniqueIndex"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	
	AdvertiserNames  string  `json:"advertiser_names" gorm:"-"`
	
	Advertisers []Profile `json:"advertisers,omitempty" gorm:"-"`
	Advertiser  *Profile  `json:"advertiser,omitempty" gorm:"-"`
	Bookings    []Booking `json:"bookings,omitempty" gorm:"foreignKey:PackageID"`
}

type PackageAdvertiser struct {
	TravelPackageID uuid.UUID `json:"travel_package_id" gorm:"column:travel_package_id;type:uuid;primaryKey"`
	AdvertiserID    uuid.UUID `json:"advertiser_id" gorm:"column:advertiser_id;type:uuid;primaryKey"`
}
