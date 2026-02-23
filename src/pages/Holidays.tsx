import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Loader2, CalendarIcon, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Holiday { id: string; holiday_date: string; holiday_name: string; holiday_type: 'paid' | 'unpaid'; }
interface WeekendConfig { id: string; day_of_week: number; is_weekend: boolean; }

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weekendConfig, setWeekendConfig] = useState<WeekendConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ holiday_date: undefined as Date | undefined, holiday_name: '', holiday_type: 'paid' as 'paid' | 'unpaid' });
  const { toast } = useToast();

  useEffect(() => { fetchHolidays(); fetchWeekendConfig(); }, []);

  const fetchHolidays = async () => {
    const { data } = await supabase.from('holidays').select('*').order('holiday_date');
    setHolidays(data || []);
    setLoading(false);
  };

  const fetchWeekendConfig = async () => {
    const { data } = await supabase.from('weekend_config').select('*').order('day_of_week');
    setWeekendConfig(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.holiday_date) return;
    const { error } = await supabase.from('holidays').insert({ holiday_date: format(formData.holiday_date, 'yyyy-MM-dd'), holiday_name: formData.holiday_name, holiday_type: formData.holiday_type });
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Holiday added' }); setDialogOpen(false); setFormData({ holiday_date: undefined, holiday_name: '', holiday_type: 'paid' }); fetchHolidays(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    toast({ title: 'Deleted' });
    fetchHolidays();
  };

  const toggleWeekend = async (dayOfWeek: number, currentValue: boolean) => {
    const { error } = await supabase.from('weekend_config').update({ is_weekend: !currentValue }).eq('day_of_week', dayOfWeek);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: `${dayOfWeek === 6 ? 'Saturday' : 'Sunday'} ${!currentValue ? 'Off' : 'Working'}` }); fetchWeekendConfig(); }
  };

  const saturdayConfig = weekendConfig.find(c => c.day_of_week === 6);
  const sundayConfig = weekendConfig.find(c => c.day_of_week === 0);
  const upcomingHolidays = holidays.filter(h => new Date(h.holiday_date) >= new Date());
  const pastHolidays = holidays.filter(h => new Date(h.holiday_date) < new Date());

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Holidays & Weekends</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage holidays and weekly off days</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Holiday</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start', !formData.holiday_date && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{formData.holiday_date ? format(formData.holiday_date, 'PPP') : 'Pick date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={formData.holiday_date} onSelect={(d) => setFormData({ ...formData, holiday_date: d })} /></PopoverContent></Popover>
              </div>
              <div className="space-y-2"><Label>Holiday Name</Label><Input value={formData.holiday_name} onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Type</Label><Select value={formData.holiday_type} onValueChange={(v: 'paid' | 'unpaid') => setFormData({ ...formData, holiday_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full">Add Holiday</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-primary"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{upcomingHolidays.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-primary"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{holidays.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Holiday List */}
      <Card>
        <div className="px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">All Holidays</span>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Header */}
              <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr_80px] gap-2 px-4 py-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Date</span>
                <span>Name</span>
                <span>Type</span>
                <span className="text-right">Actions</span>
              </div>
              {holidays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No holidays added yet</div>
              ) : (
                holidays.map(h => {
                  const isPast = new Date(h.holiday_date) < new Date();
                  return (
                    <div key={h.id} className={cn(
                      'flex flex-col sm:grid sm:grid-cols-[1fr_2fr_1fr_80px] gap-1 sm:gap-2 sm:items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                      isPast && 'opacity-60'
                    )}>
                      <div>
                        <p className="text-sm font-mono">{format(new Date(h.holiday_date), 'dd MMM yyyy')}</p>
                        <p className="text-[10px] text-muted-foreground sm:hidden">{format(new Date(h.holiday_date), 'EEEE')}</p>
                      </div>
                      <p className="font-medium text-sm">{h.holiday_name}</p>
                      <span>
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                          h.holiday_type === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                        )}>
                          {h.holiday_type}
                        </span>
                      </span>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
