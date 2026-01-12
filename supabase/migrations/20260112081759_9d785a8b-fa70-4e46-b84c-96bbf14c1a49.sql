-- Update has_role function to explicitly deny unauthenticated users
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;

-- Update is_admin_or_manager function to explicitly deny unauthenticated users
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('admin', 'manager')
    )
  END
$$;

-- Revoke all access from anon role on sensitive tables
REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.attendance_logs FROM anon;
REVOKE ALL ON public.daily_attendance FROM anon;
REVOKE ALL ON public.devices FROM anon;
REVOKE ALL ON public.sync_logs FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- Ensure only authenticated users have any access (they still need to pass RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_logs TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;