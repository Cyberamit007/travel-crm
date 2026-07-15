import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse, SystemHealth } from '../types/index';

export function useSystemHealth() {
  return useQuery<ApiResponse<SystemHealth>>({
    queryKey: ['system-health'],
    queryFn: async () => (await api.get('/system/health')).data,
    refetchInterval: 30 * 1000,
  });
}
