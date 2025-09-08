"use client";

import { useNextAuth } from '@/lib/nextauth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouteRefetch } from '@/lib/use-route-refetch';
import { SuzaiProvider } from '@/lib/suzai/SuzaiContext';

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useNextAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle route changes and refetch data
  useRouteRefetch();

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
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar onCollapseChange={setSidebarCollapsed} />
        <div className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <main className="flex-1 px-12 md:px-6 sm:px-4 pt-8 overflow-hidden min-h-0">
            {children}
          </main>
        </div>
        {/* SUZai Widget - Always accessible */}
      </div>
    </SuzaiProvider>
  );
}
