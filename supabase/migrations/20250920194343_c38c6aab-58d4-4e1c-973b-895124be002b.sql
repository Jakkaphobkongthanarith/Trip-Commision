-- Add advertiser_id column to travel_packages table
ALTER TABLE public.travel_packages 
ADD COLUMN advertiser_id uuid REFERENCES auth.users(id);

-- Update RLS policy to allow advertisers to view their assigned packages
DROP POLICY IF EXISTS "Everyone can view active packages" ON public.travel_packages;

CREATE POLICY "Everyone can view active packages and advertisers can view their assigned packages"
ON public.travel_packages
FOR SELECT
USING (
  (is_active = true) OR 
  (get_current_user_role() = 'manager'::app_role) OR
  (get_current_user_role() = 'advertiser'::app_role AND auth.uid() = advertiser_id)
);

-- Allow advertisers to update their assigned packages
CREATE POLICY "Advertisers can update their assigned packages"
ON public.travel_packages
FOR UPDATE
USING (
  (get_current_user_role() = 'manager'::app_role) OR
  (get_current_user_role() = 'advertiser'::app_role AND auth.uid() = advertiser_id)
);