import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export interface BusinessRule {
  id: string | null;
  key: string;
  value: string;
  defaultValue: string;
  description: string | null;
  category: string;
  updatedById: string | null;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string | null;
}

export function useBusinessRules() {
  return useQuery<ApiResponse<BusinessRule[]>>({
    queryKey: ['business-rules'],
    queryFn: async () => (await api.get('/business-rules')).data,
  });
}

export function useUpdateBusinessRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) =>
      (await api.put(`/business-rules/${key}`, { value })).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-rules'] });
      toast.success('Rule updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update rule'),
  });
}
