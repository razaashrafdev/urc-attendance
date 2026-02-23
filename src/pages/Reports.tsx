import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/attendance/DateRangeFilter';
import { supabase } from '@/integrations/supabase/client';
import { downloadAttendancePDF } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface Employee { id: string; first_name: string; last_name: string | null; }

export default function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name').eq('is_active', true).then(({ data }) => setEmployees(data || []));
  }, []);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) { toast({ variant: 'destructive', title: 'Select date range' }); return; }
    setLoading(true);
    let query = supabase.from('daily_attendance').select('*, employees(first_name, last_name)').gte('attendance_date', format(startDate, 'yyyy-MM-dd')).lte('attendance_date', format(endDate, 'yyyy-MM-dd')).order('attendance_date');
    if (selectedEmployee !== 'all') query = query.eq('employee_id', selectedEmployee);
    const { data } = await query;
    if (!data?.length) { toast({ variant: 'destructive', title: 'No records found' }); setLoading(false); return; }
    const records = data.map((a: any) => ({ employeeName: a.employees ? `${a.employees.first_name} ${a.employees.last_name || ''}`.trim() : 'Unknown', date: new Date(a.attendance_date), day: format(new Date(a.attendance_date), 'EEEE'), checkIn: a.check_in ? format(new Date(a.check_in), 'hh:mm a') : null, checkOut: a.check_out ? format(new Date(a.check_out), 'hh:mm a') : null, workHours: a.work_hours }));
    downloadAttendancePDF(records, `report-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.pdf`);
    setLoading(false);
    toast({ title: 'Report generated!' });
  };

  return (
    <AppLayout>
      <div className="page-header"><h1 className="page-title">Reports</h1><p className="page-description">Generate attendance reports</p></div>
      <Card className="w-full">
        <CardHeader><CardTitle>PDF Attendance Report</CardTitle><CardDescription>Generate downloadable attendance reports with Name, Date, Day, Check In, Check Out, and Work Hours.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}><SelectTrigger><SelectValue placeholder="All Employees" /></SelectTrigger><SelectContent><SelectItem value="all">All Employees</SelectItem>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Date Range</label><DateRangeFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} /></div>
          </div>
          <Button onClick={handleGenerateReport} disabled={loading} className="w-full">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Generate PDF Report</Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
