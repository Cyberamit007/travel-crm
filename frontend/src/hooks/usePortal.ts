import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse, PortalBooking, Traveler } from '../types/index';
import toast from 'react-hot-toast';

export function usePortalBooking(token: string) {
  return useQuery<ApiResponse<PortalBooking>>({
    queryKey: ['portal', token],
    queryFn: async () => (await api.get(`/portal/${token}`)).data,
    retry: false,
    enabled: !!token,
  });
}

export function useSubmitTraveler(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ travelerId, ...payload }: Partial<Traveler> & { travelerId: string }) =>
      (await api.put(`/portal/${token}/travelers/${travelerId}`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Details submitted — pending review');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to submit details'),
  });
}

export function useUploadTravelerDocument(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ travelerId, file }: { travelerId: string; file: File }) => {
      const formData = new FormData();
      formData.append('document', file);
      return (await api.post(`/portal/${token}/travelers/${travelerId}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', token] });
      toast.success('Document uploaded');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to upload document'),
  });
}
