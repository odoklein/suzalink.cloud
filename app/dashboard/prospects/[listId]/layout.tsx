"use client";

import { useNextAuth } from '@/lib/nextauth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRouteRefetch } from '@/lib/use-route-refetch';
import { SuzaiProvider } from '@/lib/suzai/SuzaiContext';
import { useNotificationSetup } from '@/lib/notification-realtime';

export default function ProspectsListLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useNextAuth();
  const router = useRouter();

  // Handle route changes and refetch data
  useRouteRefetch();

  // Set up notification permissions and handlers
  useNotificationSetup();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <SuzaiProvider>
      <div className="min-h-screen overflow-hidden bg-white">
        <main className="min-h-screen overflow-hidden">
          {children}
        </main>
        {/* SUZai Widget - Always accessible */}
      </div>
    </SuzaiProvider>
  );
}
