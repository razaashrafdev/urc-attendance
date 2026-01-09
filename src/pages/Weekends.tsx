import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface WeekendConfig { id: string; day_of_week: number; is_weekend: boolean; }

export default function Weekends() {
  const [config, setConfig] = useState<WeekendConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from('weekend_config').select('*').order('day_of_week');
    setConfig(data || []);
    setLoading(false);
  };

  const handleToggle = async (dayOfWeek: number, isWeekend: boolean) => {
    const { error } = await supabase.from('weekend_config').update({ is_weekend: isWeekend }).eq('day_of_week', dayOfWeek);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Updated', description: `${DAYS[dayOfWeek]} updated` }); fetchConfig(); }
  };

  return (
    <AppLayout>
      <div className="page-header"><h1 className="page-title">Weekend Configuration</h1><p className="page-description">Define which days are weekends</p></div>
      <Card className="max-w-lg">
        <CardHeader><CardTitle>Weekend Days</CardTitle><CardDescription>Toggle days that should be marked as weekends</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
            <div className="space-y-4">
              {config.map((day) => (
                <div key={day.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="font-medium">{DAYS[day.day_of_week]}</span>
                  <Switch checked={day.is_weekend} onCheckedChange={(checked) => handleToggle(day.day_of_week, checked)} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
