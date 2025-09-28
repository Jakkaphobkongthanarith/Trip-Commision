package controllers

import (
	"trip-trader-backend/models"

	"github.com/gin-gonic/gin"

	// "c:\\Users\\User\\Desktop\\Project Real\\trip-trader\\backend\\models"
	"gorm.io/gorm"
)

// ดึง travel packages ทั้งหมด
func GetAllPackagesHandler(c *gin.Context, db *gorm.DB) {
	var packages []models.TravelPackage
	println("Fetching all packages")
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(200, packages)
}

// ดึง travel package โดย ID
func GetPackageByIDHandler(c *gin.Context, db *gorm.DB) {
	id := c.Param("id")
	var pkg models.TravelPackage
	println("cat")
	
	// Debug log
	println("Searching for package with ID:", id)
	
	result := db.Where("id = ?", id).First(&pkg)
	if result.Error != nil {
		println("Error:", result.Error.Error())
		c.JSON(404, gin.H{
			"error": "Package not found", 
			"id": id,
			"sql_error": result.Error.Error(),
		})
		return
	}
	c.JSON(200, pkg)
}

// สร้าง travel package ใหม่
func CreatePackageHandler(c *gin.Context, db *gorm.DB) {
	var pkg models.TravelPackage
	if err := c.ShouldBindJSON(&pkg); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	// สร้าง record ใหม่ (GORM Create)
	result := db.Create(&pkg)
	if result.Error != nil {
		c.JSON(500, gin.H{"error": result.Error.Error()})
		return
	}
	c.JSON(200, pkg)
}



// Service สำหรับดึง travel packages ทั้งหมด
func GetAllTravelPackages(db *gorm.DB) ([]models.TravelPackage, error) {
	var packages []models.TravelPackage
	// ใช้ GORM Find (findAll)
	result := db.Find(&packages)
	return packages, result.Error
}