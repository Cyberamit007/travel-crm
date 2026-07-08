import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface LeadAgeDistribution {
  fresh: number;   // < 1 day
  recent: number;  // 1-3 days
  aging: number;   // 3-7 days
  old: number;     // 7-14 days
  stale: number;   // 14+ days
}

export interface WorkloadEntry {
  id: string;
  name: string;
  activeLeads: number;
}

export interface DailyActivity {
  created: number;
  updated: number;
  transferred: number;
  confirmed: number;
  lost: number;
}

export interface FollowUpHealth {
  today: number;
  done: number;
  pending: number;
  overdue: number;
}

export interface RecentConfirmed {
  id: string;
  name: string;
  phone: string;
  destination?: string;
  budget?: number;
  groupSize?: number;
  updatedAt: string;
  createdAt: string;
  assignedTo?: { id: string; name: string };
  campaign?: { id: string; name: string };
}

export interface DashboardStats {
  leadAge: LeadAgeDistribution;
  workload: WorkloadEntry[];
  daily: DailyActivity;
  followUpHealth: FollowUpHealth;
  recentConfirmed: RecentConfirmed[];
  campaignBreakdown: Record<string, { pending: number; confirmed: number; lost: number }>;
}

export function useDashboardStats() {
  return useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/leads/dashboard-stats');
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min
  });
}
