-- Add auto-incrementing display_id columns to key tables

-- Add display_id to travel_packages
ALTER TABLE public.travel_packages 
ADD COLUMN display_id SERIAL UNIQUE;

-- Add display_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN display_id SERIAL UNIQUE;

-- Add display_id to bookings
ALTER TABLE public.bookings 
ADD COLUMN display_id SERIAL UNIQUE;

-- Create indices for better performance
CREATE INDEX idx_travel_packages_display_id ON public.travel_packages(display_id);
CREATE INDEX idx_profiles_display_id ON public.profiles(display_id);
CREATE INDEX idx_bookings_display_id ON public.bookings(display_id);

COMMENT ON COLUMN public.travel_packages.display_id IS 'Human-readable sequential ID for easy reference';
COMMENT ON COLUMN public.profiles.display_id IS 'Human-readable sequential ID for easy reference';
COMMENT ON COLUMN public.bookings.display_id IS 'Human-readable sequential ID for easy reference';