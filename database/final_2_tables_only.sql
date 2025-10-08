-- ===================================
-- SQL SCRIPT สำหรับสร้างเฉพาะ 1 Table ที่ขาดหายไป
-- ใช้กับ Schema ที่มีอยู่แล้ว (discount_codes, package_advertisers, commissions, notifications)
-- ===================================

-- 1. สร้าง global_discount_codes table (Table เดียวที่ขาดไป)
CREATE TABLE IF NOT EXISTS public.global_discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- ===================================
-- เพิ่ม Column ใน bookings table (ถ้ายังไม่มี)
-- ===================================

-- เพิ่ม global_code_id column ใน bookings (เชื่อมโยงกับ global discount codes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'global_code_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN global_code_id UUID REFERENCES public.global_discount_codes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===================================
-- สร้าง Indexes สำหรับ Performance
-- ===================================

-- Indexes สำหรับ global_discount_codes
CREATE INDEX IF NOT EXISTS idx_global_discount_codes_code ON public.global_discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_global_discount_codes_is_active ON public.global_discount_codes(is_active);

-- ===================================
-- สร้าง Triggers สำหรับ Updated_at (ถ้ายังไม่มี)
-- ===================================

-- Triggers สำหรับ global_discount_codes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_global_discount_codes_updated_at'
        AND event_object_table = 'global_discount_codes'
    ) THEN
        CREATE TRIGGER update_global_discount_codes_updated_at 
            BEFORE UPDATE ON public.global_discount_codes
            FOR EACH ROW 
            EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- ===================================
-- Row Level Security (RLS) Policies (เช็คก่อนสร้าง)
-- ===================================

-- Enable RLS
ALTER TABLE public.global_discount_codes ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ global_discount_codes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'global_discount_codes' 
        AND policyname = 'Everyone can view active global discount codes'
    ) THEN
        CREATE POLICY "Everyone can view active global discount codes" 
            ON public.global_discount_codes FOR SELECT 
            TO authenticated 
            USING (is_active = true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'global_discount_codes' 
        AND policyname = 'Service role can manage all global discount codes'
    ) THEN
        CREATE POLICY "Service role can manage all global discount codes" 
            ON public.global_discount_codes FOR ALL 
            TO service_role 
            USING (true);
    END IF;
END $$;

-- ===================================
-- Grant Permissions
-- ===================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.global_discount_codes TO authenticated;

-- Grant all permissions to service_role
GRANT ALL ON public.global_discount_codes TO service_role;

-- ===================================
-- เสร็จสิ้น! เหลือแค่ 1 ตารางเท่านั้น
-- ===================================

SELECT 'Only 1 missing table (global_discount_codes) created successfully!' as status;