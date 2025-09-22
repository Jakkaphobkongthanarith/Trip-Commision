-- Add new columns to travel_packages table
ALTER TABLE public.travel_packages 
ADD COLUMN available_from date,
ADD COLUMN available_to date,
ADD COLUMN max_guests integer DEFAULT 10,
ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;