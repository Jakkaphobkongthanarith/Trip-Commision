package services

import (
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PackageStatsService struct {
	DB *gorm.DB
}

// GetPackageWithStats - ดึง package โดยไม่มี rating/review stats
func (s *PackageStatsService) GetPackageWithStats(packageID uuid.UUID) (*models.TravelPackage, error) {
	var pkg models.TravelPackage
	
	// ดึง package ด้วย GORM Preload (ไม่มี Reviews)
	if err := s.DB.
    // ลบ Preload("Advertisers.Profile")
    Preload("Bookings", "status = ?", "confirmed").
    Where("id = ? AND is_active = ?", packageID, true).
    First(&pkg).Error; err != nil {
    return nil, err
}

	// คำนวณ stats พื้นฐาน (ไม่มี rating/review)
	s.computeBasicStats(&pkg)

	return &pkg, nil
}

// GetAllPackagesWithStats - ดึง packages ทั้งหมดโดยไม่มี rating/review stats
func (s *PackageStatsService) GetAllPackagesWithStats() ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	
	// ดึง packages ทั้งหมดด้วย GORM (ไม่มี Reviews)
	if err := s.DB.
    // ลบ Preload("Advertisers.Profile")
    Preload("Bookings", "status = ?", "confirmed").
    Where("is_active = ?", true).
    Find(&packages).Error; err != nil {
    return nil, err
}

	// คำนวณ stats สำหรับแต่ละ package (ไม่มี rating/review)
	for i := range packages {
		s.computeBasicStats(&packages[i])
	}

	return packages, nil
}

// GetActivePackagesWithPagination - ดึง packages แบบ pagination โดยไม่มี rating/review stats
func (s *PackageStatsService) GetActivePackagesWithPagination(limit, offset int) ([]models.TravelPackage, int64, error) {
	var packages []models.TravelPackage
	var total int64
	
	// นับ total packages
	if err := s.DB.
    // ลบ Preload("Advertisers.Profile")
    Preload("Bookings", "status = ?", "confirmed").
    Where("is_active = ?", true).
    Limit(limit).
    Offset(offset).
    Find(&packages).Error; err != nil {
    return nil, 0, err
}
	
	// ดึง packages แบบ pagination (ไม่มี Reviews)
	if err := s.DB.
		Preload("Advertisers.Profile").
		Preload("Bookings", "status = ?", "confirmed").
		Where("is_active = ?", true).
		Limit(limit).
		Offset(offset).
		Find(&packages).Error; err != nil {
		return nil, 0, err
	}

	// คำนวณ stats สำหรับแต่ละ package (ไม่มี rating/review)
	for i := range packages {
		s.computeBasicStats(&packages[i])
	}

	return packages, total, nil
}

// computeBasicStats - คำนวณ stats พื้นฐาน (ไม่มี rating/review)
func (s *PackageStatsService) computeBasicStats(pkg *models.TravelPackage) {
	// คำนวณ advertiser names
	var advertiserNames []string
	for _, advertiser := range pkg.Advertisers {
		if advertiser.Profile != nil && advertiser.Profile.DisplayName != "" {
			advertiserNames = append(advertiserNames, advertiser.Profile.DisplayName)
		}
	}
	
	// รวม advertiser names
	if len(advertiserNames) > 0 {
		result := ""
		for i, name := range advertiserNames {
			if i > 0 {
				result += ", "
			}
			result += name
		}
		pkg.AdvertiserNames = result
	}
	
	// คำนวณ current bookings
	pkg.CurrentBookings = len(pkg.Bookings)
}