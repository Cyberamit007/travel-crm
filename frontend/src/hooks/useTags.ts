import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Tag } from '../types/index';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/tags');
      return data.data as Tag[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const { data } = await api.post('/tags', payload);
      return data.data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; color: string }) => {
      const { data } = await api.put(`/tags/${id}`, payload);
      return data.data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useSetLeadTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) => {
      await api.put(`/tags/lead/${leadId}`, { tagIds });
    },
    onSuccess: (_d, { leadId }) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}
