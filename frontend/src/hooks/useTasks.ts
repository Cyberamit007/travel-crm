import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { BookingTask, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useBookingTasks(bookingId: string | null) {
  return useQuery<ApiResponse<BookingTask[]>>({
    queryKey: ['tasks', bookingId],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${bookingId}/tasks`);
      return data;
    },
    enabled: !!bookingId,
  });
}

export function useMyTasks(filters: { status?: string; department?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.department) params.set('department', filters.department);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const { data } = await api.get(`/tasks/my-tasks?${params.toString()}`);
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function useAllTasks(filters: { status?: string; department?: string; assigneeId?: string; bookingId?: string } = {}) {
  return useQuery({
    queryKey: ['all-tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.department) params.set('department', filters.department);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters.bookingId) params.set('bookingId', filters.bookingId);
      const { data } = await api.get(`/tasks/all?${params.toString()}`);
      return data;
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<BookingTask> & { id: string }) => {
      const { data } = await api.patch(`/tasks/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['my-tasks'] });
      qc.invalidateQueries({ queryKey: ['all-tasks'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update task'),
  });
}

export function useCreateTask(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<BookingTask>) => {
      const { data } = await api.post(`/bookings/${bookingId}/tasks`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', bookingId] });
      toast.success('Task created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create task'),
  });
}
