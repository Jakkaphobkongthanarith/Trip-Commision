package models

import (
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
	Rating      float64   `json:"rating"`
	ReviewCount int       `json:"review_count" gorm:"column:review_count"`
	MaxGuests        int       `json:"max_guests" gorm:"column:max_guests"`
	CurrentBookings  int       `json:"current_bookings" gorm:"column:current_bookings;default:0"`
	Tags             string    `json:"-" gorm:"column:tags"` // ไม่ส่งออกใน JSON โดยตรง
	TagsArray        []string  `json:"tags" gorm:"-"` // ส่งออกใน JSON แต่ไม่เก็บใน DB
	// เพิ่ม field อื่นๆ ตาม schema
}
