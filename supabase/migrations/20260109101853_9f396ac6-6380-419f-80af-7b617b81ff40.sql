-- Create enum for holiday types
CREATE TYPE public.holiday_type AS ENUM ('paid', 'unpaid');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'weekend', 'holiday', 'half_day');

-- Create employees table
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_user_id VARCHAR(50) NOT NULL UNIQUE,
    employee_code VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    department VARCHAR(100),
    designation VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_logs table (raw punches from device)
CREATE TABLE public.attendance_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    punch_time TIMESTAMP WITH TIME ZONE NOT NULL,
    device_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(employee_id, punch_time)
);

-- Create daily_attendance table (processed daily records)
CREATE TABLE public.daily_attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    work_hours NUMERIC(5, 2),
    status public.attendance_status NOT NULL DEFAULT 'present',
    total_punches INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(employee_id, attendance_date)
);

-- Create weekend_config table
CREATE TABLE public.weekend_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_weekend BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(day_of_week)
);

-- Insert default weekend configuration (Friday, Saturday off)
INSERT INTO public.weekend_config (day_of_week, is_weekend) VALUES
    (0, false), -- Sunday
    (1, false), -- Monday
    (2, false), -- Tuesday
    (3, false), -- Wednesday
    (4, false), -- Thursday
    (5, true),  -- Friday
    (6, true);  -- Saturday

-- Create holidays table
CREATE TABLE public.holidays (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name VARCHAR(255) NOT NULL,
    holiday_type public.holiday_type NOT NULL DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create devices table for future multi-device support
CREATE TABLE public.devices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    device_ip VARCHAR(45) NOT NULL,
    device_port INTEGER NOT NULL DEFAULT 4370,
    location VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default device
INSERT INTO public.devices (device_name, device_ip, device_port, location) VALUES
    ('Main Entrance', '192.168.1.201', 4370, 'URC Office');

-- Create sync_logs table to track device synchronization
CREATE TABLE public.sync_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    sync_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sync_end_at TIMESTAMP WITH TIME ZONE,
    records_fetched INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekend_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can view employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view attendance_logs" ON public.attendance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage attendance_logs" ON public.attendance_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view daily_attendance" ON public.daily_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage daily_attendance" ON public.daily_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view weekend_config" ON public.weekend_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage weekend_config" ON public.weekend_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view holidays" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage holidays" ON public.holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage devices" ON public.devices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view sync_logs" ON public.sync_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sync_logs" ON public.sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_attendance_updated_at BEFORE UPDATE ON public.daily_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weekend_config_updated_at BEFORE UPDATE ON public.weekend_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();