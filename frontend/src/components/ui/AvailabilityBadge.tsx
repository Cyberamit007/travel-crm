import { AvailabilityStatus } from '../../types/index';
import { cn } from '../../utils/helpers';

const CONFIG: Record<AvailabilityStatus, { label: string; dot: string; text: string }> = {
  AVAILABLE: { label: 'Available', dot: 'bg-green-500',  text: 'text-green-700' },
  BUSY:      { label: 'Busy',      dot: 'bg-amber-500',  text: 'text-amber-700' },
  OFFLINE:   { label: 'Offline',   dot: 'bg-slate-400',  text: 'text-slate-500' },
};

interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  showLabel?: boolean;
  size?: 'xs' | 'sm';
}

export default function AvailabilityBadge({ status, showLabel = true, size = 'sm' }: AvailabilityBadgeProps) {
  const c = CONFIG[status] ?? CONFIG.OFFLINE;
  const dotSize = size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  return (
    <span className={cn('inline-flex items-center gap-1', c.text)}>
      <span className={cn('rounded-full flex-shrink-0 ring-1 ring-white', c.dot, dotSize)} />
      {showLabel && <span className={size === 'xs' ? 'text-xs' : 'text-xs font-medium'}>{c.label}</span>}
    </span>
  );
}
