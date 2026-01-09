import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'weekend' | 'holiday' | 'half_day';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
}

const statusConfig: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: 'Present', className: 'status-present' },
  absent: { label: 'Absent', className: 'status-absent' },
  weekend: { label: 'Weekend', className: 'status-weekend' },
  holiday: { label: 'Holiday', className: 'status-holiday' },
  half_day: { label: 'Half Day', className: 'bg-warning/10 text-warning-foreground' },
};

export function AttendanceStatusBadge({ status }: AttendanceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.present;
  
  return (
    <span className={cn('status-badge', config.className)}>
      {config.label}
    </span>
  );
}
