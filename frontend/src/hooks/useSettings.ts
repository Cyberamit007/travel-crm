import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { OrgSettings } from '../types/index';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as OrgSettings;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<OrgSettings>) => {
      const { data } = await api.put('/settings', payload);
      return data.data as OrgSettings;
    },
    onSuccess: (newData) => {
      qc.setQueryData(['settings'], newData);
    },
  });
}
