import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse, AutomationRule, AutomationCondition, AutomationAction } from '../types/index';
import toast from 'react-hot-toast';

export function useAutomationRules() {
  return useQuery<ApiResponse<AutomationRule[]>>({
    queryKey: ['automation-rules'],
    queryFn: async () => (await api.get('/automation-rules')).data,
  });
}

interface CreateRulePayload {
  name: string; triggerType: string; conditions: AutomationCondition[]; actions: AutomationAction[]; delayMinutes?: number | null;
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRulePayload) => (await api.post('/automation-rules', payload)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Automation rule created'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create rule'),
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateRulePayload> & { id: string; isActive?: boolean }) =>
      (await api.put(`/automation-rules/${id}`, payload)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Automation rule updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update rule'),
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/automation-rules/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-rules'] }); toast.success('Automation rule removed'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to remove rule'),
  });
}
