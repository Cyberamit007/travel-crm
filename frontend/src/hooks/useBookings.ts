import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Booking, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export function useBookingByLead(leadId: string | null) {
  return useQuery<ApiResponse<Booking>>({
    queryKey: ['booking', leadId],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/lead/${leadId}`);
      return data;
    },
    enabled: !!leadId,
    retry: false,
  });
}

type BookingPayload = {
  leadId: string;
  travelerName: string;
  numberOfTravelers: number;
  aadharNumber?: string;
  foodPreference: string;
  roomSharing: string;
  departureLocation?: string;
  departurePackage?: string;
  tourType: string;
  specialRequest?: string;
  finalPrice: number;
  amountPaid: number;
  balanceDueDate?: string;
};

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BookingPayload) => {
      const { data } = await api.post('/bookings', payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['booking', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['lead', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Booking confirmed!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to confirm booking'),
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadId, ...payload }: Partial<Booking> & { id: string; leadId: string }) => {
      const { data } = await api.put(`/bookings/${id}`, payload);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['booking', vars.leadId] });
      toast.success('Booking updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update booking'),
  });
}
