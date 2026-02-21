import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isSameDay, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Download, Users, UserCheck, Clock, UserX, CalendarDays } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { downloadAttendancePDF } from '@/lib/pdfGenerator';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: 'present' | 'absent' | 'weekend' | 'holiday' | 'half_day';
  employees: { first_name: string; last_name: string | null; department: string | null; designation: string | null } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string | null;
  department: string | null;
  designation: string | null;
}

const statusColors: Record<string, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-red-500',
  weekend: 'bg-gray-400',
  holiday: 'bg-blue-500',
  half_day: 'bg-amber-500',
};

const statusDotColors: Record<string, string> = {
  present: 'bg-emerald-500',
  absent: 'bg-red-500',
  weekend: 'bg-gray-300',
  holiday: 'bg-blue-500',
  half_day: 'bg-amber-500',
};

function getInitials(first: string, last?: string | null) {
  return `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();
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

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [currentMonth]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, first_name, last_name, department, designation').eq('is_active', true);
    setEmployees(data || []);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_attendance')
      .select('*, employees(first_name, last_name, department, designation)')
      .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'))
      .order('attendance_date', { ascending: false });
    setAttendance((data as AttendanceRecord[]) || []);
    setLoading(false);
  };

  const dailyRecords = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return attendance.filter(a => a.attendance_date === dateStr);
  }, [attendance, selectedDate]);

  const stats = useMemo(() => {
    const total = employees.length;
    const present = dailyRecords.filter(r => r.status === 'present').length;
    const absent = dailyRecords.filter(r => r.status === 'absent').length;
    const halfDay = dailyRecords.filter(r => r.status === 'half_day').length;
    const holiday = dailyRecords.filter(r => r.status === 'holiday').length;
    const totalHours = dailyRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
    const avgHours = present > 0 ? (totalHours / present) : 0;
    return { total, present, absent, halfDay, holiday, avgHours };
  }, [dailyRecords, employees]);

  // Monthly view: group by employee
  const monthlyData = useMemo(() => {
    const empMap = new Map<string, { employee: Employee; records: Map<string, string> }>();
    employees.forEach(emp => {
      empMap.set(emp.id, { employee: emp, records: new Map() });
    });
    attendance.forEach(rec => {
      const entry = empMap.get(rec.employee_id);
      if (entry) {
        entry.records.set(rec.attendance_date, rec.status);
      }
    });
    return Array.from(empMap.values());
  }, [attendance, employees]);

  const handleExportPDF = () => {
    const records = (viewMode === 'daily' ? dailyRecords : attendance).map(a => ({
      employeeName: a.employees ? `${a.employees.first_name} ${a.employees.last_name || ''}`.trim() : 'Unknown',
      date: new Date(a.attendance_date),
      day: format(new Date(a.attendance_date), 'EEEE'),
      checkIn: a.check_in ? format(new Date(a.check_in), 'hh:mm a') : null,
      checkOut: a.check_out ? format(new Date(a.check_out), 'hh:mm a') : null,
      workHours: a.work_hours,
    }));
    downloadAttendancePDF(records, `attendance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[130px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={attendance.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className="text-xs"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Daily
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
              className="text-xs"
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Monthly
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total Team', value: stats.total, color: 'text-primary' },
          { icon: UserCheck, label: 'Present', value: stats.present, color: 'text-emerald-600' },
          { icon: Clock, label: 'Half Day', value: stats.halfDay, color: 'text-amber-600' },
          { icon: UserX, label: 'Absent', value: stats.absent, color: 'text-red-600' },
          { icon: CalendarDays, label: 'Holiday', value: stats.holiday, color: 'text-blue-600' },
          { icon: Clock, label: 'Avg Hours', value: `${stats.avgHours.toFixed(1)}h`, color: 'text-emerald-600' },
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

      {/* Calendar Strip */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max pb-2">
          {daysInMonth.map(day => {
            const dayNum = day.getDate();
            const dayName = dayNames[getDay(day)];
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);
            // Check if any attendance exists for this date
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasRecords = attendance.some(a => a.attendance_date === dateStr);

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex flex-col items-center w-10 py-2 rounded-lg transition-all text-xs',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : today
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                <span className="text-[10px]">{dayName}</span>
                <span className="font-bold text-sm">{dayNum}</span>
                {hasRecords && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : viewMode === 'daily' ? (
        /* ─── Daily View ─── */
        <Card>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {['present', 'absent', 'half_day', 'holiday', 'weekend'].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', statusColors[s] || 'bg-gray-400')} />
                  {s === 'half_day' ? 'Half Day' : s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Team Member</span>
              <span>Check In</span>
              <span>Check Out</span>
              <span>Work Hours</span>
              <span className="text-right">Status</span>
            </div>
            {dailyRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No attendance records for this date
              </div>
            ) : (
              dailyRecords.map(record => {
                const name = record.employees ? `${record.employees.first_name} ${record.employees.last_name || ''}`.trim() : 'Unknown';
                return (
                  <div key={record.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold', getAvatarColor(name))}>
                        {getInitials(record.employees?.first_name || '?', record.employees?.last_name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">{record.employees?.designation || record.employees?.department || ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono">
                      {record.check_in ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {format(new Date(record.check_in), 'HH:mm')}
                        </span>
                      ) : '—'}
                    </span>
                    <span className="text-sm font-mono">
                      {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '—'}
                    </span>
                    <span className="text-sm font-mono">
                      {record.work_hours ? `${Math.floor(record.work_hours)}h ${Math.round((record.work_hours % 1) * 60)}m` : '—'}
                    </span>
                    <span className="text-right">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                        record.status === 'present' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        record.status === 'absent' && 'bg-red-50 text-red-700 border-red-200',
                        record.status === 'half_day' && 'bg-amber-50 text-amber-700 border-amber-200',
                        record.status === 'holiday' && 'bg-blue-50 text-blue-700 border-blue-200',
                        record.status === 'weekend' && 'bg-gray-50 text-gray-600 border-gray-200',
                      )}>
                        {record.status === 'half_day' ? 'Half Day' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : (
        /* ─── Monthly View ─── */
        <Card>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')} — Monthly Overview</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {['present', 'absent', 'half_day', 'holiday', 'weekend'].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', statusDotColors[s])} />
                  {s === 'half_day' ? 'Half Day' : s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </div>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-max">
              {/* Day headers */}
              <div className="flex items-center border-b border-border bg-muted/50">
                <div className="w-52 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">Team Member</div>
                {daysInMonth.map(day => (
                  <div key={day.getDate()} className="w-9 text-center py-2">
                    <div className="text-[9px] text-muted-foreground">{dayNames[getDay(day)]}</div>
                    <div className={cn(
                      'text-xs font-bold',
                      isToday(day) && 'text-primary',
                    )}>{day.getDate()}</div>
                  </div>
                ))}
                <div className="w-16 text-center text-xs font-semibold text-muted-foreground uppercase px-2">Present</div>
              </div>
              {/* Employee rows */}
              {monthlyData.map(({ employee, records }) => {
                const name = `${employee.first_name} ${employee.last_name || ''}`.trim();
                const presentCount = Array.from(records.values()).filter(s => s === 'present').length;
                return (
                  <div key={employee.id} className="flex items-center border-b border-border last:border-0 hover:bg-muted/20">
                    <div className="w-52 px-4 py-2.5 flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0', getAvatarColor(name))}>
                        {getInitials(employee.first_name, employee.last_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{employee.designation || employee.department || ''}</p>
                      </div>
                    </div>
                    {daysInMonth.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const status = records.get(dateStr);
                      return (
                        <div key={day.getDate()} className="w-9 flex justify-center py-2.5">
                          {status ? (
                            <div className={cn('w-3 h-3 rounded-full', statusDotColors[status] || 'bg-gray-300')} title={`${format(day, 'MMM d')}: ${status}`} />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-muted" />
                          )}
                        </div>
                      );
                    })}
                    <div className="w-16 text-center font-bold text-sm text-emerald-600">{presentCount}</div>
                  </div>
                );
              })}
              {monthlyData.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No employees found</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
