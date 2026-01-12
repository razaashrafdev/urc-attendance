import { useState, useEffect } from 'react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { Users, UserCheck, UserX, Calendar, RefreshCw, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

interface SyncInfo {
  lastSync: string | null;
  deviceCount: number;
  activeDevices: number;
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
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({ lastSync: null, deviceCount: 0, activeDevices: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchSyncInfo();
  }, []);

  const fetchSyncInfo = async () => {
    try {
      const { data: devices } = await supabase
        .from('devices')
        .select('id, is_active, last_sync_at');

      const { data: latestSync } = await supabase
        .from('sync_logs')
        .select('sync_start_at')
        .order('sync_start_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSyncInfo({
        lastSync: latestSync?.sync_start_at || null,
        deviceCount: devices?.length || 0,
        activeDevices: devices?.filter(d => d.is_active).length || 0,
      });
    } catch (error) {
      console.error('Error fetching sync info:', error);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    toast.info('Refreshing data from database...');
    
    await Promise.all([fetchDashboardData(), fetchSyncInfo()]);
    
    toast.success('Data refreshed! To sync from device, run the local sync service.');
    setSyncing(false);
  };

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
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Overview of attendance statistics and recent activity</p>
        </div>
        
        {/* Sync Status Card */}
        <Card className="sm:min-w-[280px]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  syncInfo.activeDevices > 0 ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  {syncInfo.activeDevices > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {syncInfo.activeDevices > 0 
                      ? `${syncInfo.activeDevices} Device${syncInfo.activeDevices > 1 ? 's' : ''} Active`
                      : 'No Active Devices'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {syncInfo.lastSync 
                      ? `Last sync: ${formatDistanceToNow(new Date(syncInfo.lastSync), { addSuffix: true })}`
                      : 'Never synced'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
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
