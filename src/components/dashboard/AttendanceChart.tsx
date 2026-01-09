import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  present: number;
  absent: number;
}

interface AttendanceChartProps {
  data: ChartData[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217 91% 50%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(217 91% 50%)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 88%)" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(0 0% 100%)',
              border: '1px solid hsl(215 25% 88%)',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area 
            type="monotone" 
            dataKey="present" 
            stroke="hsl(217 91% 50%)" 
            fillOpacity={1} 
            fill="url(#colorPresent)" 
            strokeWidth={2}
            name="Present"
          />
          <Area 
            type="monotone" 
            dataKey="absent" 
            stroke="hsl(0 84% 60%)" 
            fillOpacity={1} 
            fill="url(#colorAbsent)" 
            strokeWidth={2}
            name="Absent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
