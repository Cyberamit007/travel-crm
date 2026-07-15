import { NotificationSeverity } from '../types/index';

export const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  INFO: 'bg-slate-400',
  REMINDER: 'bg-amber-400',
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

export const CATEGORIES = ['SALES', 'OPERATIONS', 'FINANCE', 'CUSTOMER', 'SYSTEM'] as const;
