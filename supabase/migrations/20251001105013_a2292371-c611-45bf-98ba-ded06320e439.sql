-- Add contact information fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Update travel_packages with mock date ranges that match duration
UPDATE public.travel_packages 
SET 
  available_from = '2024-03-01'::date,
  available_to = '2024-03-01'::date + (duration || ' days')::interval
WHERE available_from IS NULL;

-- Add some variety to the mock dates
UPDATE public.travel_packages 
SET 
  available_from = '2024-04-15'::date,
  available_to = '2024-04-15'::date + (duration || ' days')::interval
WHERE title LIKE '%Beach%';

UPDATE public.travel_packages 
SET 
  available_from = '2024-05-01'::date,
  available_to = '2024-05-01'::date + (duration || ' days')::interval
WHERE title LIKE '%Mountain%';

UPDATE public.travel_packages 
SET 
  available_from = '2024-06-01'::date,
  available_to = '2024-06-01'::date + (duration || ' days')::interval
WHERE title LIKE '%Ayutthaya%';