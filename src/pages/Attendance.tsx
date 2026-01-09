import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Loader2, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/attendance/DateRangeFilter';
import { AttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { downloadAttendancePDF } from '@/lib/pdfGenerator';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: 'present' | 'absent' | 'weekend' | 'holiday' | 'half_day';
  employees: { first_name: string; last_name: string | null } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string | null;
}

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedEmployee, startDate, endDate]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, first_name, last_name').eq('is_active', true);
    setEmployees(data || []);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    let query = supabase
      .from('daily_attendance')
      .select('*, employees(first_name, last_name)')
      .order('attendance_date', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('employee_id', selectedEmployee);
    }
    if (startDate) {
      query = query.gte('attendance_date', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      query = query.lte('attendance_date', format(endDate, 'yyyy-MM-dd'));
    }

    const { data } = await query.limit(100);
    setAttendance((data as AttendanceRecord[]) || []);
    setLoading(false);
  };

  const handleExportPDF = () => {
    const records = attendance.map(a => ({
      employeeName: a.employees ? `${a.employees.first_name} ${a.employees.last_name || ''}`.trim() : 'Unknown',
      date: new Date(a.attendance_date),
      day: format(new Date(a.attendance_date), 'EEEE'),
      checkIn: a.check_in ? format(new Date(a.check_in), 'hh:mm a') : null,
      checkOut: a.check_out ? format(new Date(a.check_out), 'hh:mm a') : null,
      workHours: a.work_hours,
    }));
    downloadAttendancePDF(records, `attendance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-description">View and manage daily attendance records</p>
        </div>
        <Button onClick={handleExportPDF} disabled={attendance.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Name</TableHead>
                  <TableHead className="table-header">Date</TableHead>
                  <TableHead className="table-header">Day</TableHead>
                  <TableHead className="table-header">Check In</TableHead>
                  <TableHead className="table-header">Check Out</TableHead>
                  <TableHead className="table-header">Work Hours</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
                ) : attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.employees ? `${record.employees.first_name} ${record.employees.last_name || ''}`.trim() : '-'}</TableCell>
                    <TableCell>{format(new Date(record.attendance_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{format(new Date(record.attendance_date), 'EEEE')}</TableCell>
                    <TableCell>{record.check_in ? format(new Date(record.check_in), 'hh:mm a') : '-'}</TableCell>
                    <TableCell>{record.check_out ? format(new Date(record.check_out), 'hh:mm a') : '-'}</TableCell>
                    <TableCell>{record.work_hours ? `${record.work_hours.toFixed(2)} hrs` : '-'}</TableCell>
                    <TableCell><AttendanceStatusBadge status={record.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
