import { cn } from '../../utils/helpers';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export function LoadingSpinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full border-slate-200 border-t-primary-600 animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-4 bg-slate-200 rounded animate-pulse', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 pb-2 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="flex-1 h-3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, ci) => (
            <SkeletonLine key={ci} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
