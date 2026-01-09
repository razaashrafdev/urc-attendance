import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Users, UserCheck, UserX, Calendar } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { DateRangeFilter } from '@/components/attendance/DateRangeFilter';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
}

interface RecentAttendance {
  id: string;
  employeeName: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'weekend' | 'holiday' | 'half_day';
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [chartData, setChartData] = useState<{ date: string; present: number; absent: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch total employees
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch today's attendance
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayAttendance } = await supabase
        .from('daily_attendance')
        .select(`
          id,
          check_in,
          check_out,
          status,
          employees (
            first_name,
            last_name
          )
        `)
        .eq('attendance_date', today);

      const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const absentToday = (employeeCount || 0) - presentToday;

      setStats({
        totalEmployees: employeeCount || 0,
        presentToday,
        absentToday,
        onLeaveToday: todayAttendance?.filter(a => a.status === 'holiday').length || 0,
      });

      // Recent attendance for table
      const recentData: RecentAttendance[] = todayAttendance?.slice(0, 10).map(a => ({
        id: a.id,
        employeeName: a.employees 
          ? `${(a.employees as any).first_name} ${(a.employees as any).last_name || ''}`.trim()
          : 'Unknown',
        checkIn: a.check_in ? format(new Date(a.check_in), 'hh:mm a') : null,
        checkOut: a.check_out ? format(new Date(a.check_out), 'hh:mm a') : null,
        status: a.status as any,
      })) || [];

      setRecentAttendance(recentData);

      // Generate chart data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, 'yyyy-MM-dd');
      });

      const { data: weeklyAttendance } = await supabase
        .from('daily_attendance')
        .select('attendance_date, status')
        .in('attendance_date', last7Days);

      const chartDataFormatted = last7Days.map(date => {
        const dayData = weeklyAttendance?.filter(a => a.attendance_date === date) || [];
        return {
          date: format(new Date(date), 'EEE'),
          present: dayData.filter(a => a.status === 'present').length,
          absent: dayData.filter(a => a.status === 'absent').length,
        };
      });

      setChartData(chartDataFormatted);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of attendance statistics and recent activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={<Users className="w-6 h-6 text-primary" />}
          description="Active employees"
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={<UserCheck className="w-6 h-6 text-success" />}
          description={`${((stats.presentToday / stats.totalEmployees) * 100 || 0).toFixed(0)}% attendance`}
        />
        <StatCard
          title="Absent Today"
          value={stats.absentToday}
          icon={<UserX className="w-6 h-6 text-destructive" />}
          description="Not checked in"
        />
        <StatCard
          title="On Holiday"
          value={stats.onLeaveToday}
          icon={<Calendar className="w-6 h-6 text-accent" />}
          description="Scheduled leave"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={chartData} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No attendance records for today
              </p>
            ) : (
              <div className="space-y-4">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{record.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.checkIn ? `In: ${record.checkIn}` : 'Not checked in'}
                        {record.checkOut && ` • Out: ${record.checkOut}`}
                      </p>
                    </div>
                    <AttendanceStatusBadge status={record.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
