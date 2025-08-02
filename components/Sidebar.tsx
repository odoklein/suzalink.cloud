"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  BarChart,
  MessageCircle,
  Mail,
  Settings,
  UserCog,
  LogOut,
  UserPlus,
  UserCircle,
  ShieldCheck,
  FolderKanban,
  FileBarChart,
  Bot,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [unopenedCount, setUnopenedCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed(!collapsed);

  useEffect(() => {
    async function fetchUnopened() {
      try {
        const res = await fetch("/api/commandes?unopened=1");
        if (res.ok) {
          const { count } = await res.json();
          setUnopenedCount(count || 0);
        }
      } catch {}
    }
    fetchUnopened();
  }, []);

  const handleLogout = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Logout failed: " + error.message);
        return;
      }
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (err: any) {
      toast.error("Logout error: " + (err?.message || err));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Navigation groups
  interface NavLink {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    admin?: boolean;
    target?: string;
  }

  interface NavGroup {
    label: string;
    links: NavLink[];
  }

  const navGroups: NavGroup[] = [
    {
      label: "Principal",
      links: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/dashboard/projects", label: "Projets", icon: Briefcase },
        { href: "/dashboard/prospects", label: "Prospects", icon: FolderKanban },
        { href: "/dashboard/clients", label: "Clients", icon: UserCheck },
        { href: "/dashboard/clients/dashboard", label: "Dashboard Clients", icon: BarChart },
        { href: "/dashboard/bookings", label: "Réservations", icon: Calendar },
        { href: "/dashboard/email", label: "Email", icon: Mail}, 
      ],
    },
    {
      label: "Communication",
      links: [
        { href: "/dashboard/ChatSystem", label: "Messagerie", icon: MessageCircle },
      ],
    },
    {
      label: "Finances",
      links: [
        { href: "/dashboard/finance", label: "Finances", icon: BarChart },
        { href: "/dashboard/finance/factures", label: "Factures", icon: FileText },
      ],
    },
    {
      label: "Administration",
      links: [
        { href: "/dashboard/users", label: "Utilisateurs", icon: UserCog, admin: true },
        { href: "/dashboard/profile", label: "Profil", icon: UserCircle },
      ],
    },
  ];

  // Filter links by role
  const filteredGroups = navGroups.map((group) => ({
    ...group,
    links: group.links.filter((link) => {
      if (!userProfile) return false;
      if (link.admin && userProfile.role !== "admin") return false;
      return true;
    }),
  })).filter((group) => group.links.length > 0);

  return (
    <aside className={`sticky top-0 h-screen ${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col shadow-lg z-20 transition-all duration-200`}>
      {/* Collapse Toggle */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-white rounded-full p-1.5 border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg z-10 transition-all duration-200"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Header Section */}
      <div className={`${collapsed ? 'p-4' : 'p-6'} border-b border-gray-200`}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-block">
            {collapsed ? (
              <img src="/iconlogo.svg" alt="Suzalink Icon Logo" className="h-8 w-auto" />
            ) : (
              <img src="/logopng.svg" alt="Suzalink Logo" className="h-8 w-auto" />
            )}
          </span>
        </div>

        {/* User Role Display */}
        {userProfile && !collapsed && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Rôle</span>
            </div>
            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(userProfile.role)}`}>
              {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 flex flex-col overflow-y-auto p-4">
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pl-1">
                  {group.label}
                </div>
              )}
              <ul className="space-y-1">
                {group.links.map((link) => {
                  const isActive = pathname && pathname.startsWith(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        target={link.target}
                        className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-3 rounded-lg px-3 py-2.5 font-medium transition-all duration-200 text-sm group relative
                          ${isActive 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        title={collapsed ? link.label : ''}
                      >
                        <link.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        {!collapsed && <span>{link.label}</span>}
                        {!collapsed && link.href === "/dashboard/commandes" && unopenedCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-500" title="Nouvelles demandes" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          className={`w-full rounded-lg border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 text-sm font-medium py-2.5`}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && 'Déconnexion'}
        </Button>
      </div>
    </aside>
  );
}
