-- Migration: Create package_advertisers junction table and global_discount_codes table

-- สร้าง junction table สำหรับ package-advertiser relationship
CREATE TABLE IF NOT EXISTS package_advertisers (
    package_id UUID NOT NULL REFERENCES travel_packages(id) ON DELETE CASCADE,
    advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (package_id, advertiser_id)
);

-- เพิ่ม index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_package_advertisers_package_id ON package_advertisers(package_id);
CREATE INDEX IF NOT EXISTS idx_package_advertisers_advertiser_id ON package_advertisers(advertiser_id);

-- ลบ package_id column จาก discount_codes table (ทำให้เป็น advertiser-based)
ALTER TABLE discount_codes DROP COLUMN IF EXISTS package_id;

-- สร้าง global_discount_codes table
CREATE TABLE IF NOT EXISTS global_discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เพิ่ม index สำหรับ global_discount_codes
CREATE INDEX IF NOT EXISTS idx_global_discount_codes_code ON global_discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_global_discount_codes_active ON global_discount_codes(is_active);

-- อัปเดต updated_at trigger สำหรับ global_discount_codes
CREATE OR REPLACE FUNCTION update_global_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_discount_codes_updated_at
    BEFORE UPDATE ON global_discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_global_discount_codes_updated_at();