-- Enable managers to view and delete any profile
CREATE POLICY IF NOT EXISTS "Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (get_current_user_role() = 'manager'::app_role);

CREATE POLICY IF NOT EXISTS "Managers can delete any profile"
ON public.profiles
FOR DELETE
USING (get_current_user_role() = 'manager'::app_role);
