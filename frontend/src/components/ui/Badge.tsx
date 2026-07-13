import { LeadStatus, LeadSource, CampaignStatus } from '../../types/index';
import { leadStatusConfig, leadSourceConfig, campaignStatusConfig, cn } from '../../utils/helpers';

interface BadgeProps {
  status?: LeadStatus;
  source?: LeadSource;
  campaignStatus?: CampaignStatus;
  className?: string;
  children?: React.ReactNode;
}

export default function Badge({ status, source, campaignStatus, className, children }: BadgeProps) {
  if (status) {
    const cfg = leadStatusConfig[status];
    return (
      <span className={cn('badge', cfg.bg, cfg.color, className)}>
        {cfg.label}
      </span>
    );
  }

  if (source) {
    const cfg = leadSourceConfig[source] ?? { label: source, color: 'text-slate-700', bg: 'bg-slate-100', icon: '🔗' };
    return (
      <span className={cn('badge', cfg.bg, cfg.color, className)}>
        <span className="mr-1">{cfg.icon}</span>
        {cfg.label}
      </span>
    );
  }

  if (campaignStatus) {
    const cfg = campaignStatusConfig[campaignStatus];
    return (
      <span className={cn('badge', cfg.bg, cfg.color, className)}>
        {cfg.label}
      </span>
    );
  }

  return (
    <span className={cn('badge bg-slate-100 text-slate-700', className)}>
      {children}
    </span>
  );
}
