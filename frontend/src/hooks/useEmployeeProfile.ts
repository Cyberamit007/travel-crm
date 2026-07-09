import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { EmployeeProfile, AvailabilityStatus } from '../types/index';

export function useEmployeeProfile(id: string | null) {
  return useQuery({
    queryKey: ['employee-profile', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}/profile`);
      return data.data as EmployeeProfile;
    },
    enabled: !!id,
  });
}

export function useUpdateAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: AvailabilityStatus }) => {
      const { data } = await api.put(`/users/${id}/availability`, { availability });
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['employee-profile', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
