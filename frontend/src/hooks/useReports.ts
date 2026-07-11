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

export function useLostReasonReport(params: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'lost-reasons', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/lost-reasons', { params });
      return data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useCampaignReport(params: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'campaigns', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/campaigns', { params });
      return data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

export function useDailyTrend(params: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'daily-trend', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/daily-trend', { params });
      return data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}
