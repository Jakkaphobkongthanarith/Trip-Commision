-- SQL สำหรับเพิ่ม 'expired' เข้า constraint (รันใน database ถ้าต้องการ)

-- 1. Drop constraint เก่า
ALTER TABLE bookings DROP CONSTRAINT bookings_payment_status_check;

-- 2. สร้าง constraint ใหม่ที่รวม 'expired'
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text, 'expired'::text]));