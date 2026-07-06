import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { User, EmployeePerformance, PaginatedResponse, ApiResponse } from '../types/index';
import toast from 'react-hot-toast';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
      const { data } = await api.get(`/users?${params}`);
      return data;
    },
  });
}

export function useEmployeePerformance() {
  return useQuery<ApiResponse<EmployeePerformance[]>>({
    queryKey: ['employee-performance'],
    queryFn: async () => {
      const { data } = await api.get('/users/performance');
      return data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      role: string;
      phone?: string;
    }) => {
      const { data } = await api.post('/users', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['employee-performance'] });
      toast.success('User created successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<User> & { id: string; password?: string }) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['employee-performance'] });
      toast.success('User updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['employee-performance'] });
      toast.success('User deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    },
  });
}
