import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { LeaveRequest } from '../types/index';

export function useLeaves(params?: { status?: string; employeeId?: string }) {
  return useQuery({
    queryKey: ['leaves', params],
    queryFn: async () => {
      const { data } = await api.get('/leaves', { params });
      return data.data as LeaveRequest[];
    },
  });
}

export function useUpcomingLeaves() {
  return useQuery({
    queryKey: ['leaves', 'upcoming'],
    queryFn: async () => {
      const { data } = await api.get('/leaves/upcoming');
      return data.data as LeaveRequest[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; reason: string }) => {
      const { data } = await api.post('/leaves', payload);
      return data.data as LeaveRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: 'APPROVED' | 'REJECTED'; adminNote?: string }) => {
      const { data } = await api.put(`/leaves/${id}/status`, { status, adminNote });
      return data.data as LeaveRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/leaves/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}
