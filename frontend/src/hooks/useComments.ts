import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { LeadComment } from '../types/index';

export function useLeadComments(leadId: string | null) {
  return useQuery({
    queryKey: ['comments', leadId],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${leadId}/comments`);
      return data.data as LeadComment[];
    },
    enabled: !!leadId,
  });
}

export function useCreateComment(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { content: string; parentId?: string }) => {
      const { data } = await api.post(`/leads/${leadId}/comments`, payload);
      return data.data as LeadComment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', leadId] }),
  });
}

export function useUpdateComment(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data } = await api.put(`/leads/${leadId}/comments/${id}`, { content });
      return data.data as LeadComment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', leadId] }),
  });
}

export function useDeleteComment(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leads/${leadId}/comments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', leadId] }),
  });
}
