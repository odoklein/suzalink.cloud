"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook to handle route changes and refetch data
 * This ensures that data is refreshed when navigating between pages
 */
export function useRouteRefetch() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate all queries when route changes
    // This ensures fresh data on navigation
    queryClient.invalidateQueries();
  }, [pathname, queryClient]);
}

/**
 * Custom hook to refetch specific query keys on route change
 * @param queryKeys - Array of query keys to invalidate
 */
export function useRouteRefetchQueries(queryKeys: string[][]) {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate specific queries when route changes
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }, [pathname, queryClient, queryKeys]);
} 