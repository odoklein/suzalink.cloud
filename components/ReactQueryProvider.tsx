"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Refetch on window focus to ensure data is fresh
        refetchOnWindowFocus: true,
        // Refetch on reconnect to handle network issues
        refetchOnReconnect: true,
        // Retry failed requests
        retry: 3,
        // Stale time - data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache time - keep data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
      },
      mutations: {
        // Retry failed mutations
        retry: 1,
      },
    },
  }));
  
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
} 