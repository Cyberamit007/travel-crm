import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { PackageItinerary, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useItinerary(packageId: string | null) {
  return useQuery<ApiResponse<PackageItinerary[]>>({
    queryKey: ['itinerary', packageId],
    queryFn: async () => {
      const { data } = await api.get(`/packages/${packageId}/itinerary`);
      return data;
    },
    enabled: !!packageId,
  });
}

export function useCreateItineraryItem(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PackageItinerary>) => {
      const { data } = await api.post(`/packages/${packageId}/itinerary`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itinerary', packageId] });
      toast.success('Step added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to add step'),
  });
}

export function useUpdateItineraryItem(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PackageItinerary> & { id: string }) => {
      const { data } = await api.put(`/packages/${packageId}/itinerary/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itinerary', packageId] });
      toast.success('Step updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update step'),
  });
}

export function useDeleteItineraryItem(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/packages/${packageId}/itinerary/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itinerary', packageId] });
      toast.success('Step deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete step'),
  });
}

export function useReorderItinerary(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; dayOffset: number; sortOrder: number }>) => {
      const { data } = await api.put(`/packages/${packageId}/itinerary/reorder`, { items });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itinerary', packageId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to reorder'),
  });
}
