import { LeadPriority } from '../../types/index';
import { cn } from '../../utils/helpers';

const CONFIG: Record<LeadPriority, { label: string; dot: string; bg: string; text: string }> = {
  HIGH:   { label: 'High',   dot: 'bg-red-500',    bg: 'bg-red-50 border-red-200',    text: 'text-red-700' },
  MEDIUM: { label: 'Medium', dot: 'bg-amber-500',  bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  LOW:    { label: 'Low',    dot: 'bg-green-500',   bg: 'bg-green-50 border-green-200', text: 'text-green-700' },
};

interface PriorityBadgeProps {
  priority: LeadPriority;
  size?: 'sm' | 'md';
}

export default function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const c = CONFIG[priority] ?? CONFIG.MEDIUM;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        c.bg, c.text,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
      )}
    >
      <span className={cn('rounded-full flex-shrink-0', c.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {c.label}
    </span>
  );
}
