import { useQuery } from '@tanstack/react-query';

export interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string;
  status: 'active' | 'pending' | 'inactive';
  region?: string;
}

export function useClientsQuery({ search, status, region, page, pageSize }: {
  search: string;
  status: string;
  region: string;
  page: number;
  pageSize: number;
}): ReturnType<typeof import('@tanstack/react-query').useQuery<{ data: Client[]; count: number }, Error>> {
  return useQuery<{ data: Client[]; count: number }, Error>({
    queryKey: [
      'clients',
      search,
      status,
      region,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('name', search);
      if (status) params.append('status', status);
      if (region) params.append('region', region);
      params.append('limit', String(pageSize));
      params.append('offset', String((page - 1) * pageSize));
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      const { data, count } = await res.json();
      return { data, count };
    },

  });
}
