package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// DiscountCode - ตรงกับตาราง discount_codes ที่มีอยู่
type DiscountCode struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	Code               string     `json:"code" gorm:"unique;not null"` // รหัสส่วนลด (auto-generated)
	DiscountPercentage float64    `json:"discount_percentage"` // % ส่วนลดที่ให้ลูกค้า
	PackageID          *uuid.UUID `json:"package_id" gorm:"type:uuid"` // แพคเกจที่เชื่อมโยง (null = ทุกแพคเกจ)
	AdvertiserID       uuid.UUID  `json:"advertiser_id" gorm:"type:uuid;not null"` // เจ้าของโค้ด
	IsActive           bool       `json:"is_active" gorm:"default:true"` // เปิด/ปิดใช้งาน
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	
	// Relations
	Advertiser User           `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID"`
	Package    *TravelPackage `json:"package,omitempty" gorm:"foreignKey:PackageID"`
}

// Commission - ใช้ตารางที่มีอยู่แล้ว
type Commission struct {
	ID                   uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	AdvertiserID         uuid.UUID `json:"advertiser_id" gorm:"type:uuid;not null"`
	BookingID            uuid.UUID `json:"booking_id" gorm:"type:uuid;not null"`
	DiscountCodeID       *uuid.UUID `json:"discount_code_id" gorm:"type:uuid"` // เชื่อมโยงกับโค้ดส่วนลด
	CommissionAmount     float64   `json:"commission_amount"` // จำนวนเงินค่าคอมมิชชั่น
	CommissionPercentage float64   `json:"commission_percentage" gorm:"default:5"` // % ค่าคอมมิชชั่น
	Status               string    `json:"status" gorm:"default:pending"` // pending, paid
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
	
	// Relations
	Advertiser   User         `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID"`
	Booking      Booking      `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
	DiscountCode *DiscountCode `json:"discount_code,omitempty" gorm:"foreignKey:DiscountCodeID"`
}

// GenerateDiscountCode - สร้างโค้ดส่วนลดอัตโนมัติ
func GenerateDiscountCode(packageTitle string, discountPercentage float64) string {
	// ใช้ 3 ตัวอักษรแรกของชื่อแพคเกจ + ส่วนลด + random number
	prefix := ""
	if len(packageTitle) >= 3 {
		prefix = packageTitle[:3]
	} else {
		prefix = packageTitle
	}
	
	// แปลงเป็นพิมพ์ใหญ่และลบ space
	prefix = strings.ToUpper(strings.ReplaceAll(prefix, " ", ""))
	
	// สร้างโค้ด: PREFIX + DISCOUNT + RANDOM
	randomSuffix := uuid.New().String()[:4] // 4 ตัวอักษรแรกของ UUID
	return fmt.Sprintf("%s%d%s", prefix, int(discountPercentage), strings.ToUpper(randomSuffix))
}

// IsValidForUse - ตรวจสอบว่าใช้โค้ดได้หรือไม่
func (dc *DiscountCode) IsValidForUse() bool {
	return dc.IsActive
}