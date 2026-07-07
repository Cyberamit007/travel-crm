import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: number;
  trendLabel?: string;
  className?: string;
  onClick?: () => void;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  iconBg = 'bg-primary-100',
  iconColor = 'text-primary-600',
  trend,
  trendLabel,
  className,
  onClick,
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn('stat-card', onClick && 'cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {trendLabel && <p className="text-xs text-slate-400 mt-0.5">{trendLabel}</p>}
      </div>
    </div>
  );
}
