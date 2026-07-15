import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  ApiResponse, PackageAnalytics, DestinationAnalytics, CampaignAnalytics, CustomerAnalytics, EmployeeAnalytics,
} from '../types/index';

export function usePackageAnalytics() {
  return useQuery<ApiResponse<PackageAnalytics[]>>({
    queryKey: ['analytics', 'packages'],
    queryFn: async () => (await api.get('/analytics/packages')).data,
  });
}

export function useDestinationAnalytics() {
  return useQuery<ApiResponse<DestinationAnalytics[]>>({
    queryKey: ['analytics', 'destinations'],
    queryFn: async () => (await api.get('/analytics/destinations')).data,
  });
}

export function useCampaignAnalytics() {
  return useQuery<ApiResponse<CampaignAnalytics[]>>({
    queryKey: ['analytics', 'campaigns'],
    queryFn: async () => (await api.get('/analytics/campaigns')).data,
  });
}

export function useCustomerAnalytics() {
  return useQuery<ApiResponse<CustomerAnalytics>>({
    queryKey: ['analytics', 'customers'],
    queryFn: async () => (await api.get('/analytics/customers')).data,
  });
}

export function useEmployeeAnalytics() {
  return useQuery<ApiResponse<EmployeeAnalytics[]>>({
    queryKey: ['analytics', 'employees'],
    queryFn: async () => (await api.get('/analytics/employees')).data,
  });
}
