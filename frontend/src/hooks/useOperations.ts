import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  ApiResponse, PaginatedResponse, OpsDashboardStats, Departure, DepartureListItem,
  Traveler, Hotel, Vehicle, Vendor, DepartureTask, OperationsDocument, OperationsNote,
} from '../types/index';
import toast from 'react-hot-toast';

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export function useOpsDashboard() {
  return useQuery<ApiResponse<OpsDashboardStats>>({
    queryKey: ['operations', 'dashboard'],
    queryFn: async () => (await api.get('/operations/dashboard')).data,
    staleTime: 60 * 1000,
  });
}

// ─── Departures ────────────────────────────────────────────────────────────────

export interface DepartureFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useDepartures(filters: DepartureFilters = {}) {
  return useQuery<PaginatedResponse<DepartureListItem>>({
    queryKey: ['operations', 'departures', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      const { data } = await api.get(`/operations/departures?${params.toString()}`);
      return data;
    },
  });
}

export function useDeparture(id: string | undefined) {
  return useQuery<ApiResponse<Departure>>({
    queryKey: ['operations', 'departure', id],
    queryFn: async () => (await api.get(`/operations/departures/${id}`)).data,
    enabled: !!id,
  });
}

export function useUpdateDeparture(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<Departure, 'status' | 'tripCaptainName' | 'tripCaptainPhone' | 'tripCaptainStatus' | 'returnDate'>>) =>
      (await api.put(`/operations/departures/${id}`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', id] });
      qc.invalidateQueries({ queryKey: ['operations', 'departures'] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Departure updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update departure'),
  });
}

// ─── Travelers (Passenger List) ─────────────────────────────────────────────────

export function useCreateTraveler(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, ...payload }: Partial<Traveler> & { bookingId: string; name: string }) =>
      (await api.post(`/operations/bookings/${bookingId}/travelers`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      toast.success('Traveler added');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add traveler'),
  });
}

export function useUpdateTraveler(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Traveler> & { id: string }) =>
      (await api.put(`/operations/travelers/${id}`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      toast.success('Traveler updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update traveler'),
  });
}

export function useDeleteTraveler(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/travelers/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      toast.success('Traveler removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove traveler'),
  });
}

// ─── Hotels ──────────────────────────────────────────────────────────────────

export function useCreateHotel(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Hotel>) => (await api.post(`/operations/departures/${departureId}/hotels`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Hotel added');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add hotel'),
  });
}

export function useUpdateHotel(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Hotel> & { id: string }) => (await api.put(`/operations/hotels/${id}`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Hotel updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update hotel'),
  });
}

export function useDeleteHotel(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/hotels/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Hotel removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove hotel'),
  });
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export function useCreateVehicle(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Vehicle>) => (await api.post(`/operations/departures/${departureId}/vehicles`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Vehicle added');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add vehicle'),
  });
}

export function useUpdateVehicle(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Vehicle> & { id: string }) => (await api.put(`/operations/vehicles/${id}`, payload)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Vehicle updated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update vehicle'),
  });
}

export function useDeleteVehicle(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/vehicles/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      qc.invalidateQueries({ queryKey: ['operations', 'dashboard'] });
      toast.success('Vehicle removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove vehicle'),
  });
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export function useVendors(filters: { search?: string; type?: string; status?: string } = {}) {
  return useQuery<ApiResponse<Vendor[]>>({
    queryKey: ['operations', 'vendors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      const { data } = await api.get(`/operations/vendors?${params.toString()}`);
      return data;
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Vendor> & { name: string }) => (await api.post('/operations/vendors', payload)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operations', 'vendors'] }); toast.success('Vendor added'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add vendor'),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Vendor> & { id: string }) => (await api.put(`/operations/vendors/${id}`, payload)).data.data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operations', 'vendors'] }); toast.success('Vendor updated'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update vendor'),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/vendors/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['operations', 'vendors'] }); toast.success('Vendor removed'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove vendor'),
  });
}

// ─── Day-wise timeline tasks ─────────────────────────────────────────────────

export function useCreateTask(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string; dayOffset?: number }) =>
      (await api.post(`/operations/departures/${departureId}/tasks`, payload)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add task'),
  });
}

export function useUpdateTaskStatus(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DepartureTask['status'] }) =>
      (await api.put(`/operations/tasks/${id}`, { status })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update task'),
  });
}

// ─── Documents ───────────────────────────────────────────────────────────────

export function useUploadDocument(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (type) form.append('type', type);
      const { data } = await api.post(`/operations/departures/${departureId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as OperationsDocument;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      toast.success('Document uploaded');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Upload failed'),
  });
}

export function useDeleteDocument(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/documents/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] });
      toast.success('Document removed');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove document'),
  });
}

// ─── Internal notes ──────────────────────────────────────────────────────────

export function useCreateNote(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => (await api.post(`/operations/departures/${departureId}/notes`, { content })).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add note'),
  });
}

export function useDeleteNote(departureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/operations/notes/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operations', 'departure', departureId] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove note'),
  });
}
