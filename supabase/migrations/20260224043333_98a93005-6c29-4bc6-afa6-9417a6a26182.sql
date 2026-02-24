
-- Add new holiday types
ALTER TYPE public.holiday_type ADD VALUE IF NOT EXISTS 'public';
ALTER TYPE public.holiday_type ADD VALUE IF NOT EXISTS 'office';
