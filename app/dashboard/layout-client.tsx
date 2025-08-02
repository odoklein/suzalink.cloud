"use client";

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { BellIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouteRefetch } from '@/lib/use-route-refetch';

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Handle route changes and refetch data
  useRouteRefetch();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 px-12 md:px-6 sm:px-4 pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
