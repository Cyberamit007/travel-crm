import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Department, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useDepartments(params: { status?: string } = {}) {
  return useQuery<ApiResponse<Department[]>>({
    queryKey: ['departments', params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      const { data } = await api.get(`/departments?${qs}`);
      return data;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; code?: string; description?: string; headId?: string }) => {
      const { data } = await api.post('/departments', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department created'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create department'),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Department> & { id: string }) => {
      const { data } = await api.put(`/departments/${id}`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update department'),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/departments/${id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete department'),
  });
}
