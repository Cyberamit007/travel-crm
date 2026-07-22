import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Package, PackageAuditLog, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export interface PackageFilters {
  status?: string;
  destinationId?: string;
  tourCategoryId?: string;
  search?: string;
  packageType?: string;
}

export function usePackage(id: string | null | undefined) {
  return useQuery<ApiResponse<Package>>({
    queryKey: ['packages', id],
    queryFn: async () => {
      const { data } = await api.get(`/packages/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePackageAudit(id: string | null | undefined) {
  return useQuery<ApiResponse<PackageAuditLog[]>>({
    queryKey: ['packages', id, 'audit'],
    queryFn: async () => {
      const { data } = await api.get(`/packages/${id}/audit`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePackages(filters: PackageFilters = {}) {
  return useQuery<ApiResponse<Package[]>>({
    queryKey: ['packages', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.packageType) params.set('packageType', filters.packageType);
      if (filters.destinationId) params.set('destinationId', filters.destinationId);
      if (filters.tourCategoryId) params.set('tourCategoryId', filters.tourCategoryId);
      if (filters.search) params.set('search', filters.search);
      const { data } = await api.get(`/packages?${params.toString()}`);
      return data;
    },
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Package, 'id' | 'createdAt' | 'updatedAt' | 'destination' | 'tourCategory'>) => {
      const { data } = await api.post('/packages', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to create package'),
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Package> & { id: string }) => {
      const { data } = await api.put(`/packages/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update package'),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/packages/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to delete package'),
  });
}
