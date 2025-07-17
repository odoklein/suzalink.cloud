import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'primary' | 'secondary' | 'decision_maker';
  title?: string;
}

export function useClientContactsQuery(clientId: string) {
  return useQuery<Contact[], Error>({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/contacts`);
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return await res.json();
    }
  });

}

export function useAddContactMutation(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Omit<Contact, 'id'>) => {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error('Failed to add contact');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] });
    },
  });
}

export function useDeleteContactMutation(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] });
    },
  });
}
