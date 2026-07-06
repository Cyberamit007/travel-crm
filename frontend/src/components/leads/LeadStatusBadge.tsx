import { LeadStatus } from '../../types/index';
import { leadStatusConfig, cn } from '../../utils/helpers';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export default function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const cfg = leadStatusConfig[status];
  return (
    <span className={cn('badge', cfg.bg, cfg.color, className)}>
      {cfg.label}
    </span>
  );
}
