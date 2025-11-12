package services

import (
	"trip-trader-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PackageStatsService struct {
	DB *gorm.DB
}

func (s *PackageStatsService) GetPackageWithStats(packageID uuid.UUID) (*models.TravelPackage, error) {
	var pkg models.TravelPackage
	if err := s.DB.
		Preload("Bookings", "status = ?", "confirmed").
		Where("id = ? AND is_active = ?", packageID, true).
		First(&pkg).Error; err != nil {
		return nil, err
	}
	
	var advertisers []models.Profile
	s.DB.Table("package_advertisers").
		Select("profiles.*").
		Joins("JOIN profiles ON profiles.id = package_advertisers.advertiser_id").
		Where("package_advertisers.travel_package_id = ?", packageID).
		Find(&advertisers)
	pkg.Advertisers = advertisers
	
	s.computeBasicStats(&pkg)
	return &pkg, nil
}

func (s *PackageStatsService) GetAllPackagesWithStats() ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	if err := s.DB.
		Preload("Bookings", "status = ?", "confirmed").
		Order("is_active DESC, created_at DESC").
		Find(&packages).Error; err != nil {
		return nil, err
	}
	
	for i := range packages {
		var advertisers []models.Profile
		s.DB.Table("package_advertisers").
			Select("profiles.*").
			Joins("JOIN profiles ON profiles.id = package_advertisers.advertiser_id").
			Where("package_advertisers.travel_package_id = ?", packages[i].ID).
			Find(&advertisers)
		packages[i].Advertisers = advertisers
		s.computeBasicStats(&packages[i])
	}
	return packages, nil
}

func (s *PackageStatsService) GetActivePackagesWithPagination(limit, offset int) ([]models.TravelPackage, int64, error) {
	var packages []models.TravelPackage
	var total int64
	
	if err := s.DB.Model(&models.TravelPackage{}).Where("is_active = ?", true).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	if err := s.DB.
		Preload("Bookings", "status = ?", "confirmed").
		Where("is_active = ?", true).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&packages).Error; err != nil {
		return nil, 0, err
	}
	
	for i := range packages {
		var advertisers []models.Profile
		s.DB.Table("package_advertisers").
			Select("profiles.*").
			Joins("JOIN profiles ON profiles.id = package_advertisers.advertiser_id").
			Where("package_advertisers.travel_package_id = ?", packages[i].ID).
			Find(&advertisers)
		packages[i].Advertisers = advertisers
		s.computeBasicStats(&packages[i])
	}
	return packages, total, nil
}

func (s *PackageStatsService) computeBasicStats(pkg *models.TravelPackage) {
	var advertiserNames []string
	for _, advertiser := range pkg.Advertisers {
		if advertiser.DisplayName != "" {
			advertiserNames = append(advertiserNames, advertiser.DisplayName)
		}
	}
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
	pkg.CurrentBookings = len(pkg.Bookings)
}