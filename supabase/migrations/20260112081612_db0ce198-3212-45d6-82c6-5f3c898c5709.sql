-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- RLS policy for user_roles: users can view their own roles, admins can manage all
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies on employees
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

-- Create proper RLS policies for employees (admin/manager only)
CREATE POLICY "Admins and managers can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can manage employees"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Drop existing overly permissive policies on attendance_logs
DROP POLICY IF EXISTS "Authenticated users can manage attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Authenticated users can view attendance_logs" ON public.attendance_logs;

-- Create proper RLS policies for attendance_logs
CREATE POLICY "Admins and managers can view attendance_logs"
ON public.attendance_logs
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can manage attendance_logs"
ON public.attendance_logs
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Drop existing overly permissive policies on daily_attendance
DROP POLICY IF EXISTS "Authenticated users can manage daily_attendance" ON public.daily_attendance;
DROP POLICY IF EXISTS "Authenticated users can view daily_attendance" ON public.daily_attendance;

-- Create proper RLS policies for daily_attendance
CREATE POLICY "Admins and managers can view daily_attendance"
ON public.daily_attendance
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can manage daily_attendance"
ON public.daily_attendance
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Drop existing overly permissive policies on devices
DROP POLICY IF EXISTS "Authenticated users can manage devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated users can view devices" ON public.devices;

-- Create proper RLS policies for devices (admin only)
CREATE POLICY "Admins can view devices"
ON public.devices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage devices"
ON public.devices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies on sync_logs
DROP POLICY IF EXISTS "Authenticated users can manage sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Authenticated users can view sync_logs" ON public.sync_logs;

-- Create proper RLS policies for sync_logs (admin only)
CREATE POLICY "Admins can view sync_logs"
ON public.sync_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage sync_logs"
ON public.sync_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies on holidays
DROP POLICY IF EXISTS "Authenticated users can manage holidays" ON public.holidays;
DROP POLICY IF EXISTS "Authenticated users can view holidays" ON public.holidays;

-- Holidays can be viewed by all authenticated, managed by admin/manager
CREATE POLICY "Authenticated users can view holidays"
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers can manage holidays"
ON public.holidays
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Drop existing overly permissive policies on weekend_config
DROP POLICY IF EXISTS "Authenticated users can manage weekend_config" ON public.weekend_config;
DROP POLICY IF EXISTS "Authenticated users can view weekend_config" ON public.weekend_config;

-- Weekend config can be viewed by all authenticated, managed by admin
CREATE POLICY "Authenticated users can view weekend_config"
ON public.weekend_config
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage weekend_config"
ON public.weekend_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));