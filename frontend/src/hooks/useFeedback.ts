import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Feedback, FeedbackStats, PaginatedResponse, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useFeedbacks(page = 1, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: String(page), limit: '20', ...filters });
  return useQuery<PaginatedResponse<Feedback>>({
    queryKey: ['feedback', page, filters],
    queryFn: async () => {
      const { data } = await api.get(`/feedback?${params}`);
      return data;
    },
  });
}

export function useFeedbackStats() {
  return useQuery<ApiResponse<FeedbackStats>>({
    queryKey: ['feedback-stats'],
    queryFn: async () => {
      const { data } = await api.get('/feedback/stats');
      return data;
    },
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: string;
      title: string;
      description: string;
      page?: string;
      priority?: string;
    }) => {
      const { data } = await api.post('/feedback', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
      qc.invalidateQueries({ queryKey: ['feedback-stats'] });
      toast.success('Feedback submitted — thank you!');
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });
}

export function useUpdateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status?: string; adminNotes?: string }) => {
      const { data } = await api.patch(`/feedback/${id}`, { status, adminNotes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
      qc.invalidateQueries({ queryKey: ['feedback-stats'] });
      toast.success('Feedback updated');
    },
    onError: () => {
      toast.error('Failed to update feedback');
    },
  });
}

export function useDeleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/feedback/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] });
      qc.invalidateQueries({ queryKey: ['feedback-stats'] });
      toast.success('Feedback deleted');
    },
    onError: () => {
      toast.error('Failed to delete feedback');
    },
  });
}
