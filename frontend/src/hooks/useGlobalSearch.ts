import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse, SearchResults } from '../types/index';

export function useGlobalSearch(query: string) {
  return useQuery<ApiResponse<SearchResults>>({
    queryKey: ['global-search', query],
    queryFn: async () => (await api.get(`/search?q=${encodeURIComponent(query)}`)).data,
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}
