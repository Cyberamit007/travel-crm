import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { BookingWithLead, FinanceSummary, MonthlyFinanceData, TripGroup, PaginatedResponse } from '../types/index';

// ─── All bookings (paginated) ─────────────────────────────────────────────────

export interface BookingListFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useAllBookings(filters: BookingListFilters = {}) {
  return useQuery<PaginatedResponse<BookingWithLead>>({
    queryKey: ['erp-bookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      const { data } = await api.get(`/erp/bookings-list?${params.toString()}`);
      return data;
    },
  });
}

// ─── Finance summary ──────────────────────────────────────────────────────────

export function useFinanceSummary(year?: number, month?: number) {
  return useQuery<{ success: boolean; data: { summary: FinanceSummary; bookings: BookingWithLead[]; monthlyData: MonthlyFinanceData[] } }>({
    queryKey: ['finance-summary', year, month],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (month) params.set('month', String(month));
      const { data } = await api.get(`/erp/finance/summary?${params.toString()}`);
      return data;
    },
  });
}

// ─── Operations: upcoming trips ───────────────────────────────────────────────

export function useUpcomingTrips() {
  return useQuery<{ success: boolean; data: { upcoming: TripGroup[]; past: TripGroup[] } }>({
    queryKey: ['operations-trips'],
    queryFn: async () => {
      const { data } = await api.get('/erp/operations/trips');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface CustomerFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery<PaginatedResponse<any>>({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      const { data } = await api.get(`/erp/customers?${params.toString()}`);
      return data;
    },
  });
}
