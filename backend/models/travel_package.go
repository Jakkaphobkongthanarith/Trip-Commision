package models

import "github.com/google/uuid"

type TravelPackage struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	// เพิ่ม field อื่นๆ ตาม schema จริง
}
