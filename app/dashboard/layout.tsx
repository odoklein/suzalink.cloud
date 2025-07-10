"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-8 py-4 bg-transparent">
          <div className="flex-1 max-w-xl">
            <Input placeholder="Search or type a command" className="rounded-xl bg-white/80 border border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-200" />
          </div>
          <div className="flex items-center gap-6 ml-8">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-purple-100">
              <BellIcon className="w-6 h-6 text-gray-400" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-300 to-pink-200 border-2 border-white shadow-inner overflow-hidden">
              <span className="block w-full h-full" />
            </div>
          </div>
        </header>
        <main className="flex-1 px-12 md:px-6 sm:px-4">
          {children}
        </main>
      </div>
    </div>
  );
} 