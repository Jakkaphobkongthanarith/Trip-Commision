package models

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// DiscountCode - รหัสส่วนลดสำหรับ Advertiser (อัปเดตให้ผูกกับแพคเกจเฉพาะ)
type DiscountCode struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code               string     `json:"code" gorm:"type:text;unique;not null"` // รหัสส่วนลด (auto-generated)
	AdvertiserID       uuid.UUID  `json:"advertiser_id" gorm:"type:uuid;not null"` // เจ้าของโค้ด
	PackageID          uuid.UUID  `json:"package_id" gorm:"type:uuid;not null"` // แพคเกจที่ผูกกับโค้ด
	DiscountPercentage float64    `json:"discount_percentage" gorm:"type:numeric(5,2);not null"` // % ส่วนลดที่ให้ลูกค้า
	CommissionRate     float64    `json:"commission_rate" gorm:"type:numeric(5,2);default:5.00"` // % commission สำหรับโค้ดนี้
	MaxUses            *int       `json:"max_uses" gorm:"type:integer"` // จำนวนการใช้สูงสุด
	CurrentUses        int        `json:"current_uses" gorm:"type:integer;default:0"` // จำนวนที่ใช้ไปแล้ว
	IsActive           *bool      `json:"is_active" gorm:"type:boolean;default:true"` // เปิด/ปิดใช้งาน
	ExpiresAt          *time.Time `json:"expires_at" gorm:"type:timestamp with time zone"` // วันหมดอายุ
	CreatedAt          time.Time  `json:"created_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	UpdatedAt          time.Time  `json:"updated_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	
	// Relations
	Advertiser User          `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID"`
	Package    TravelPackage `json:"package,omitempty" gorm:"foreignKey:PackageID"`
}

// TableName กำหนดชื่อ table
func (DiscountCode) TableName() string {
	return "discount_codes"
}

// GlobalDiscountCode - รหัสส่วนลดสำหรับผู้ใช้ทั่วไป (เพิ่ม expires_at)
type GlobalDiscountCode struct {
	ID                 uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code               string     `json:"code" gorm:"unique;not null"` // รหัสส่วนลด
	DiscountPercentage float64    `json:"discount_percentage"` // % ส่วนลด
	IsActive           bool       `json:"is_active" gorm:"default:true"`
	ExpiresAt          *time.Time `json:"expires_at" gorm:"type:timestamp with time zone"` // วันหมดอายุ
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// TableName กำหนดชื่อ table
func (GlobalDiscountCode) TableName() string {
	return "global_discount_codes"
}

// Commission - ปรับให้ตรงกับ existing schema และเพิ่ม discount_code_id
type Commission struct {
	ID                   uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BookingID            uuid.UUID  `json:"booking_id" gorm:"type:uuid;not null"`
	AdvertiserID         uuid.UUID  `json:"advertiser_id" gorm:"type:uuid;not null"`
	DiscountCodeID       *uuid.UUID `json:"discount_code_id" gorm:"type:uuid"` // อ้างอิงโค้ดส่วนลดที่ใช้
	CommissionAmount     float64    `json:"commission_amount" gorm:"type:numeric(10,2);not null"` // จำนวนเงินค่าคอมมิชชั่น
	CommissionPercentage float64    `json:"commission_percentage" gorm:"type:numeric(5,2);not null;default:5.00"` // % ค่าคอมมิชชั่น
	Status               string     `json:"status" gorm:"type:text;not null;default:pending"` // pending, paid, cancelled
	PaidAt               *time.Time `json:"paid_at" gorm:"type:timestamp with time zone"` // วันที่จ่าย
	CreatedAt            time.Time  `json:"created_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	UpdatedAt            time.Time  `json:"updated_at" gorm:"type:timestamp with time zone;not null;default:now()"`
	
	// Relations
	Advertiser   User         `json:"advertiser,omitempty" gorm:"foreignKey:AdvertiserID"`
	Booking      Booking      `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
	DiscountCode DiscountCode `json:"discount_code,omitempty" gorm:"foreignKey:DiscountCodeID"`
}

// TableName กำหนดชื่อ table
func (Commission) TableName() string {
	return "commissions"
}

// GenerateDiscountCode - สร้างโค้ดส่วนลดอัตโนมัติสำหรับ Advertiser
func GenerateDiscountCode(advertiserName string, discountPercentage float64) string {
	// ใช้ 3 ตัวอักษรแรกของชื่อ Advertiser + ส่วนลด + random number
	prefix := ""
	if len(advertiserName) >= 3 {
		prefix = advertiserName[:3]
	} else {
		prefix = advertiserName
	}
	
	// แปลงเป็นพิมพ์ใหญ่และลบ space
	prefix = strings.ToUpper(strings.ReplaceAll(prefix, " ", ""))
	
	// สร้างโค้ด: PREFIX + DISCOUNT + RANDOM
	randomSuffix := uuid.New().String()[:4] // 4 ตัวอักษรแรกของ UUID
	return fmt.Sprintf("%s%d%s", prefix, int(discountPercentage), strings.ToUpper(randomSuffix))
}

// GenerateGlobalDiscountCode - สร้างโค้ดส่วนลดสำหรับผู้ใช้ทั่วไป
func GenerateGlobalDiscountCode(discountPercentage float64) string {
	randomSuffix := uuid.New().String()[:6] // 6 ตัวอักษรแรกของ UUID
	return fmt.Sprintf("GLOBAL%d%s", int(discountPercentage), strings.ToUpper(randomSuffix))
}

// IsValidForUse - ตรวจสอบว่าใช้โค้ดได้หรือไม่
func (dc *DiscountCode) IsValidForUse() bool {
	if dc.IsActive == nil {
		return false
	}
	// ตรวจสอบว่าโค้ดยังใช้งานได้
	if !*dc.IsActive {
		return false
	}
	// ตรวจสอบจำนวนการใช้
	if dc.MaxUses != nil && dc.CurrentUses >= *dc.MaxUses {
		return false
	}
	// ตรวจสอบวันหมดอายุ
	if dc.ExpiresAt != nil && time.Now().After(*dc.ExpiresAt) {
		return false
	}
	return true
}

// IsValidForPackage - ตรวจสอบว่าโค้ดใช้ได้กับแพคเกจนี้หรือไม่
func (dc *DiscountCode) IsValidForPackage(packageID uuid.UUID) bool {
	return dc.PackageID == packageID && dc.IsValidForUse()
}

func (gdc *GlobalDiscountCode) IsValidForUse() bool {
	// ตรวจสอบว่าโค้ดยังใช้งานได้
	if !gdc.IsActive {
		return false
	}
	// ตรวจสอบวันหมดอายุ
	if gdc.ExpiresAt != nil && time.Now().After(*gdc.ExpiresAt) {
		return false
	}
	return true
}