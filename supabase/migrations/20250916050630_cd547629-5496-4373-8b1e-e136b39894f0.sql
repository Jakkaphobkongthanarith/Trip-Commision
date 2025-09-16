DO $$
BEGIN
  CREATE POLICY "Managers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (get_current_user_role() = 'manager'::app_role);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Managers can delete any profile"
  ON public.profiles
  FOR DELETE
  USING (get_current_user_role() = 'manager'::app_role);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
