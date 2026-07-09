import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ActivityLog } from '../types/index';

interface ActivityParams {
  page?: number;
  limit?: number;
  entityType?: string;
  userId?: string;
}

export function useActivityFeed(params?: ActivityParams) {
  return useQuery({
    queryKey: ['activity-feed', params],
    queryFn: async () => {
      const { data } = await api.get('/activity', { params });
      return data as { data: ActivityLog[]; meta: { total: number; totalPages: number; page: number } };
    },
    staleTime: 30 * 1000,
  });
}
