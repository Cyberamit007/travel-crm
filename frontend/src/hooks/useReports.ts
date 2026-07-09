import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface ReportParams {
  startDate: string;
  endDate: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export function useLeadReport(params: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'leads', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/leads', { params });
      return data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function usePerformanceReport(params: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'performance', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/performance', { params });
      return data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}
