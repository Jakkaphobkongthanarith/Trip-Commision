package models

import (
	"time"

	"github.com/google/uuid"
)

type InclusionType struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name         string    `gorm:"type:text;not null" json:"name"`
	NameEn       string    `gorm:"type:text" json:"name_en"`
	NameTh       string    `gorm:"type:text" json:"name_th"`
	Description  string    `gorm:"type:text" json:"description"`
	Category     string    `gorm:"type:text" json:"category"`
	DisplayOrder int       `gorm:"default:0" json:"display_order"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (InclusionType) TableName() string {
	return "inclusion_types"
}

type PackageInclusion struct {
	PackageID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"package_id"`
	InclusionID uuid.UUID `gorm:"type:uuid;primaryKey" json:"inclusion_id"`
	IsIncluded  bool      `gorm:"default:true" json:"is_included"`
	CustomNote  string    `gorm:"type:text" json:"custom_note,omitempty"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	
	Inclusion InclusionType `gorm:"foreignKey:InclusionID" json:"inclusion,omitempty"`
}

func (PackageInclusion) TableName() string {
	return "package_inclusions"
}
