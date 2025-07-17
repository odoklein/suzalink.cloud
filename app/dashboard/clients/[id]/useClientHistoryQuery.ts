import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface HistoryEntry {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  date: string;
  description: string;
  outcome?: string;
}

export function useClientHistoryQuery(clientId: string) {
  return useQuery<HistoryEntry[], Error>({
    queryKey: ['client-history', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return await res.json();
    }
  });

}

export function useAddHistoryMutation(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<HistoryEntry, 'id' | 'date'>) => {
      const res = await fetch(`/api/clients/${clientId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('Failed to add history entry');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-history', clientId] });
    },
  });
}

export function useDeleteHistoryMutation(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (historyId: string) => {
      const res = await fetch(`/api/clients/${clientId}/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId }),
      });
      if (!res.ok) throw new Error('Failed to delete history entry');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-history', clientId] });
    },
  });
}
