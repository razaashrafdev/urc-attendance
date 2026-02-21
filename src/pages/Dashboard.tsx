import { useState, useEffect } from 'react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { Users, UserCheck, UserX, Calendar, RefreshCw, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  halfDayToday: number;
  holidayToday: number;
  avgHours: number;
}

interface RecentRecord {
  id: string;
  employeeName: string;
  designation: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  status: string;
}

interface SyncInfo {
  lastSync: string | null;
  activeDevices: number;
}

const avatarColors = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600',
  'bg-pink-600', 'bg-cyan-600', 'bg-red-600', 'bg-indigo-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0, presentToday: 0, absentToday: 0, halfDayToday: 0, holidayToday: 0, avgHours: 0,
  });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [chartData, setChartData] = useState<{ date: string; present: number; absent: number }[]>([]);
  const [syncInfo, setSyncInfo] = useState<SyncInfo>({ lastSync: null, activeDevices: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardData(), fetchSyncInfo()]);
    setLoading(false);
  };

  const fetchSyncInfo = async () => {
    try {
      const { data: devices } = await supabase.from('devices').select('id, is_active');
      const { data: latestSync } = await supabase.from('sync_logs').select('sync_start_at').order('sync_start_at', { ascending: false }).limit(1).maybeSingle();
      setSyncInfo({
        lastSync: latestSync?.sync_start_at || null,
        activeDevices: devices?.filter(d => d.is_active).length || 0,
      });
    } catch (error) {
      console.error('Error fetching sync info:', error);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    toast.info('Refreshing data...');
    await fetchAll();
    toast.success('Data refreshed!');
    setSyncing(false);
  };

  const fetchDashboardData = async () => {
    try {
      const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayAttendance } = await supabase
        .from('daily_attendance')
        .select('id, check_in, check_out, status, work_hours, employees(first_name, last_name, designation, department)')
        .eq('attendance_date', today);

      const present = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const halfDay = todayAttendance?.filter(a => a.status === 'half_day').length || 0;
      const holiday = todayAttendance?.filter(a => a.status === 'holiday').length || 0;
      const absent = (employeeCount || 0) - present - halfDay - holiday;
      const totalHours = todayAttendance?.reduce((sum, a) => sum + ((a.work_hours as number) || 0), 0) || 0;
      const avgHours = present > 0 ? totalHours / present : 0;

      setStats({ totalEmployees: employeeCount || 0, presentToday: present, absentToday: absent, halfDayToday: halfDay, holidayToday: holiday, avgHours });

      const recent: RecentRecord[] = todayAttendance?.slice(0, 8).map(a => {
        const emp = a.employees as any;
        const name = emp ? `${emp.first_name} ${emp.last_name || ''}`.trim() : 'Unknown';
        return {
          id: a.id,
          employeeName: name,
          designation: emp?.designation || emp?.department || '',
          checkIn: a.check_in ? format(new Date(a.check_in), 'HH:mm') : null,
          checkOut: a.check_out ? format(new Date(a.check_out), 'HH:mm') : null,
          workHours: a.work_hours as number | null,
          status: a.status as string,
        };
      }) || [];
      setRecentRecords(recent);

      const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
      const { data: weeklyAttendance } = await supabase.from('daily_attendance').select('attendance_date, status').in('attendance_date', last7Days);
      setChartData(last7Days.map(date => ({
        date: format(new Date(date), 'EEE'),
        present: weeklyAttendance?.filter(a => a.attendance_date === date && a.status === 'present').length || 0,
        absent: weeklyAttendance?.filter(a => a.attendance_date === date && a.status === 'absent').length || 0,
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      absent: 'bg-red-50 text-red-700 border-red-200',
      half_day: 'bg-amber-50 text-amber-700 border-amber-200',
      holiday: 'bg-blue-50 text-blue-700 border-blue-200',
      weekend: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border', styles[status] || styles.present)}>
        {status === 'half_day' ? 'Half Day' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of today's attendance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync Status */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            {syncInfo.activeDevices > 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="text-xs">
              <p className="font-medium">{syncInfo.activeDevices > 0 ? `${syncInfo.activeDevices} Device Active` : 'No Devices'}</p>
              <p className="text-muted-foreground">
                {syncInfo.lastSync ? `${formatDistanceToNow(new Date(syncInfo.lastSync), { addSuffix: true })}` : 'Never synced'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={syncing}>
            <RefreshCw className={cn('w-4 h-4 mr-1', syncing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total Team', value: stats.totalEmployees, color: 'text-primary' },
          { icon: UserCheck, label: 'Present', value: stats.presentToday, color: 'text-emerald-600' },
          { icon: Clock, label: 'Half Day', value: stats.halfDayToday, color: 'text-amber-600' },
          { icon: UserX, label: 'Absent', value: stats.absentToday, color: 'text-red-600' },
          { icon: Calendar, label: 'Holiday', value: stats.holidayToday, color: 'text-blue-600' },
          { icon: TrendingUp, label: 'Avg Hours', value: `${stats.avgHours.toFixed(1)}h`, color: 'text-emerald-600' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Weekly Attendance Overview</span>
          </div>
          <CardContent className="pt-4">
            <AttendanceChart data={chartData} />
          </CardContent>
        </Card>

        {/* Today's Activity */}
        <Card>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">Today's Activity</span>
            <span className="text-xs text-muted-foreground">{format(new Date(), 'MMM d')}</span>
          </div>
          <CardContent className="p-0">
            {recentRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No records today</div>
            ) : (
              recentRecords.map(record => (
                <div key={record.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0', getAvatarColor(record.employeeName))}>
                    {getInitials(record.employeeName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{record.employeeName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {record.checkIn ? `In: ${record.checkIn}` : '—'}
                      {record.checkOut && ` · Out: ${record.checkOut}`}
                      {record.workHours != null && ` · ${record.workHours.toFixed(1)}h`}
                    </p>
                  </div>
                  {statusBadge(record.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
