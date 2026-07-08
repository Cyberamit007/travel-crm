import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Notification, PaginatedResponse, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useNotifications(page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications', page, limit],
    queryFn: async () => {
      const { data } = await api.get(`/notifications?page=${page}&limit=${limit}`);
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery<ApiResponse<{ count: number }>>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });
}
