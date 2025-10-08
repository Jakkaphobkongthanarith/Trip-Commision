-- เพิ่ม expires_at column ให้ global_discount_codes table
ALTER TABLE public.global_discount_codes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NULL;

-- เพิ่ม index สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_global_discount_codes_expires_at 
ON public.global_discount_codes(expires_at);

-- เพิ่ม index สำหรับ discount_codes (ถ้ายังไม่มี)
CREATE INDEX IF NOT EXISTS idx_discount_codes_expires_at 
ON public.discount_codes(expires_at);

SELECT 'Added expires_at column to global_discount_codes successfully!' as status;