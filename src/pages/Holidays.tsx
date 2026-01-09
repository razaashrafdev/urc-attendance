import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Holiday { id: string; holiday_date: string; holiday_name: string; holiday_type: 'paid' | 'unpaid'; }

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ holiday_date: undefined as Date | undefined, holiday_name: '', holiday_type: 'paid' as 'paid' | 'unpaid' });
  const { toast } = useToast();

  useEffect(() => { fetchHolidays(); }, []);

  const fetchHolidays = async () => {
    const { data } = await supabase.from('holidays').select('*').order('holiday_date');
    setHolidays(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.holiday_date) return;
    const { error } = await supabase.from('holidays').insert({ holiday_date: format(formData.holiday_date, 'yyyy-MM-dd'), holiday_name: formData.holiday_name, holiday_type: formData.holiday_type });
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Success', description: 'Holiday added' }); setDialogOpen(false); setFormData({ holiday_date: undefined, holiday_name: '', holiday_type: 'paid' }); fetchHolidays(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchHolidays();
  };

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="page-title">Holidays</h1><p className="page-description">Manage holiday calendar</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Holiday</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start', !formData.holiday_date && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{formData.holiday_date ? format(formData.holiday_date, 'PPP') : 'Pick date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.holiday_date} onSelect={(d) => setFormData({ ...formData, holiday_date: d })} /></PopoverContent></Popover>
              </div>
              <div className="space-y-2"><Label>Holiday Name</Label><Input value={formData.holiday_name} onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={formData.holiday_type} onValueChange={(v: 'paid' | 'unpaid') => setFormData({ ...formData, holiday_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full">Add Holiday</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead className="table-header">Date</TableHead><TableHead className="table-header">Name</TableHead><TableHead className="table-header">Type</TableHead><TableHead className="table-header text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {holidays.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No holidays</TableCell></TableRow> : holidays.map((h) => (
                  <TableRow key={h.id}><TableCell>{format(new Date(h.holiday_date), 'PPP')}</TableCell><TableCell className="font-medium">{h.holiday_name}</TableCell><TableCell><span className={`status-badge ${h.holiday_type === 'paid' ? 'status-present' : 'status-weekend'}`}>{h.holiday_type}</span></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
