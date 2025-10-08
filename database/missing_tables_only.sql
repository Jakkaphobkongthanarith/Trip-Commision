-- ===================================
-- SQL SCRIPT สำหรับสร้างเฉพาะ Tables ที่ขาดหายไป
-- สำหรับ Schema ที่มีอยู่แล้ว
-- ===================================

-- 1. สร้าง global_discount_codes table (Table หลักที่ขาดไป)
CREATE TABLE IF NOT EXISTS public.global_discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. สร้าง notifications table (สำหรับระบบแจ้งเตือน)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. สร้าง commissions table (สำหรับค่าคอมมิชชั่น)
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- เพิ่ม Columns ใน bookings table (ถ้ายังไม่มี)
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

-- Indexes สำหรับ notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Indexes สำหรับ commissions
CREATE INDEX IF NOT EXISTS idx_commissions_advertiser_id ON public.commissions(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking_id ON public.commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

-- ===================================
-- สร้าง Triggers สำหรับ Updated_at
-- ===================================

-- Triggers สำหรับ global_discount_codes
CREATE TRIGGER update_global_discount_codes_updated_at 
    BEFORE UPDATE ON public.global_discount_codes
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Triggers สำหรับ notifications
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Triggers สำหรับ commissions
CREATE TRIGGER update_commissions_updated_at 
    BEFORE UPDATE ON public.commissions
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ===================================
-- Row Level Security (RLS) Policies
-- ===================================

-- Enable RLS
ALTER TABLE public.global_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ global_discount_codes
CREATE POLICY "Everyone can view active global discount codes" 
    ON public.global_discount_codes FOR SELECT 
    TO authenticated 
    USING (is_active = true);

CREATE POLICY "Service role can manage all global discount codes" 
    ON public.global_discount_codes FOR ALL 
    TO service_role 
    USING (true);

-- Policies สำหรับ notifications
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    TO authenticated 
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all notifications" 
    ON public.notifications FOR ALL 
    TO service_role 
    USING (true);

-- Policies สำหรับ commissions
CREATE POLICY "Advertisers can view their own commissions" 
    ON public.commissions FOR SELECT 
    TO authenticated 
    USING (advertiser_id = auth.uid());

CREATE POLICY "Service role can manage all commissions" 
    ON public.commissions FOR ALL 
    TO service_role 
    USING (true);

-- ===================================
-- Grant Permissions
-- ===================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.global_discount_codes TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.commissions TO authenticated;

-- Grant all permissions to service_role
GRANT ALL ON public.global_discount_codes TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.commissions TO service_role;

-- ===================================
-- เสร็จสิ้น!
-- ===================================

SELECT 'Missing database tables created successfully!' as status;