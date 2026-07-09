import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Designation, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useDesignations(params: { departmentId?: string; status?: string } = {}) {
  return useQuery<ApiResponse<Designation[]>>({
    queryKey: ['designations', params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.departmentId) qs.set('departmentId', params.departmentId);
      if (params.status) qs.set('status', params.status);
      const { data } = await api.get(`/designations?${qs}`);
      return data;
    },
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; departmentId: string; description?: string }) => {
      const { data } = await api.post('/designations', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); toast.success('Designation created'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create designation'),
  });
}

export function useUpdateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Designation> & { id: string }) => {
      const { data } = await api.put(`/designations/${id}`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); toast.success('Designation updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update designation'),
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/designations/${id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['designations'] }); toast.success('Designation deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete designation'),
  });
}
