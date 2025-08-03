"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useNextAuth } from "@/lib/nextauth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  BarChart,
  MessageCircle,
  Mail,
  Settings,
  LogOut,
  UserCircle,
  ShieldCheck,
  FolderKanban,
  FileBarChart,
  Bot,
  ChevronRight,
  ChevronLeft,
  Calendar,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  User,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const { userProfile, logout } = useNextAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Déconnecté avec succès");
    } catch (err: any) {
      toast.error("Erreur de déconnexion: " + (err?.message || err));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "manager":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Navigation groups
  interface NavLink {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    admin?: boolean;
    target?: string;
    badge?: number;
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
        { href: "/dashboard/clients/dashboard", label: "Dashboard Clients", icon: BarChart },
        { href: "/dashboard/bookings", label: "Calendrier", icon: Calendar },
        { href: "/dashboard/email", label: "Email", icon: Mail}, 
        { href: "/dashboard/utilisateurs", label: "Utilisateurs", icon: User, admin: true }, 
      ],
    },
    {
      label: "Communication",
      links: [
        { href: "/dashboard/ChatSystem", label: "Messagerie", icon: MessageCircle, badge: 2 },
      ],
    },
    {
      label: "Finances",
      links: [
        { href: "/dashboard/finance", label: "Finances", icon: BarChart },
        { href: "/dashboard/finance/factures", label: "Factures", icon: FileText },
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
    <aside className={`fixed left-0 top-0 h-screen ${collapsed ? 'w-16' : 'w-64'} bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm z-20 transition-all duration-300 ease-in-out`}>
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
      <div className={`${collapsed ? 'p-4' : 'p-6'} border-b border-gray-200 bg-white`}>
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
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
            <ShieldCheck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Rôle:</span>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(userProfile.role)}`}>
              {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 flex flex-col overflow-y-auto p-4 space-y-6">
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
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' 
                          : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                        }
                      `}
                      title={collapsed ? link.label : ''}
                    >
                      <link.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {!collapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>{link.label}</span>
                          {link.badge && (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full min-w-[20px]">
                              {link.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {userProfile?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {userProfile?.name || userProfile?.email?.split('@')[0] || 'Utilisateur'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userProfile?.email || 'user@example.com'}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* User Dropdown */}
          {userDropdownOpen && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
              >
                <User className="w-4 h-4" />
                <span>Mon profil</span>
              </Link>

              <div className="border-t border-gray-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
