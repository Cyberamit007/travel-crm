import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Destination, TourCategory, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

// ─── Destinations ─────────────────────────────────────────────────────────────

export interface DestinationFilters {
  type?: 'DOMESTIC' | 'INTERNATIONAL';
  status?: string;
  isPopular?: boolean;
  search?: string;
}

export function useDestinations(params: DestinationFilters = {}) {
  return useQuery<ApiResponse<Destination[]>>({
    queryKey: ['destinations', params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.type) qs.set('type', params.type);
      if (params.status) qs.set('status', params.status);
      if (params.isPopular !== undefined) qs.set('isPopular', String(params.isPopular));
      if (params.search) qs.set('search', params.search);
      const { data } = await api.get(`/masters/destinations?${qs}`);
      return data;
    },
  });
}

type DestinationPayload = {
  name: string; country: string; state?: string; city?: string;
  type: 'DOMESTIC' | 'INTERNATIONAL'; description?: string; isPopular?: boolean;
};

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DestinationPayload) => {
      const { data } = await api.post('/masters/destinations', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['destinations'] }); toast.success('Destination created'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create destination'),
  });
}

export function useUpdateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Destination> & { id: string }) => {
      const { data } = await api.put(`/masters/destinations/${id}`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['destinations'] }); toast.success('Destination updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update destination'),
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/masters/destinations/${id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['destinations'] }); toast.success('Destination deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete destination'),
  });
}

// ─── Tour Categories ──────────────────────────────────────────────────────────

export function useTourCategories(params: { status?: string } = {}) {
  return useQuery<ApiResponse<TourCategory[]>>({
    queryKey: ['tourCategories', params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.status) qs.set('status', params.status);
      const { data } = await api.get(`/masters/tour-categories?${qs}`);
      return data;
    },
  });
}

type CategoryPayload = {
  name: string; description?: string; icon?: string; sortOrder?: number;
};

export function useCreateTourCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CategoryPayload) => {
      const { data } = await api.post('/masters/tour-categories', payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tourCategories'] }); toast.success('Category created'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create category'),
  });
}

export function useUpdateTourCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TourCategory> & { id: string }) => {
      const { data } = await api.put(`/masters/tour-categories/${id}`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tourCategories'] }); toast.success('Category updated'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update category'),
  });
}

export function useDeleteTourCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/masters/tour-categories/${id}`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tourCategories'] }); toast.success('Category deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete category'),
  });
}
