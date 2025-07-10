"use client";
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
  UserCheck,
  UserPlus,
  UserCircle,
  ShieldCheck,
  FolderKanban,
  FileBarChart,
} from "lucide-react";
import { toast } from "sonner";

export function Sidebar() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const router = useRouter();

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
  const navGroups = [
    {
      label: "Main",
      links: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/projects", label: "Projects", icon: Briefcase },
        { href: "/dashboard/clients", label: "Clients", icon: Users },
        { href: "/dashboard/prospects", label: "Prospects", icon: UserPlus },
      ],
    },
    {
      label: "Communication",
      links: [
        { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
        { href: "/emails", label: "Email", icon: Mail },
      ],
    },
    {
      label: "Finance",
      links: [
        { href: "/dashboard/finance", label: "Finance", icon: BarChart },
        { href: "/dashboard/finance/factures", label: "Factures", icon: FileText },
      ],
    },
    {
      label: "Admin",
      links: [
        { href: "/dashboard/users", label: "User Management", icon: UserCog, admin: true },
        { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
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
    <aside className="sticky top-0 h-screen w-56 bg-[#F9F9FB] border-r border-gray-200 flex flex-col px-5 py-6 gap-2 shadow-md z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 text-2xl font-bold mb-4 select-none">
        <span className="inline-block">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="18" r="6" fill="#FF6F91" />
            <rect x="18" y="10" width="8" height="16" rx="4" fill="#6FC3FF" />
          </svg>
        </span>
        <span className="text-gray-800 font-semibold tracking-tight" style={{ fontFamily: 'Gellix, sans-serif' }}>Suzalink</span>
      </div>

      {/* User Role Display */}
      {userProfile && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Role</span>
          </div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(userProfile.role)}`}>
            {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 flex flex-col gap-8 overflow-y-auto">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 pl-1">{group.label}</div>
            <ul className="flex flex-col gap-1">
              {group.links.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors text-sm group
                        ${isActive ? "bg-purple-100 text-purple-900" : "text-gray-700 hover:bg-purple-50 hover:text-purple-900"}
                      `}
                    >
                      <link.icon className={`w-5 h-5 ${isActive ? "text-purple-700" : "text-gray-400 group-hover:text-purple-700"}`} />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-8">
        <Button
          variant="outline"
          className="w-full rounded-lg border-gray-200 hover:bg-purple-100 hover:text-purple-900 transition-colors flex items-center gap-2 justify-center text-base"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" /> Logout
        </Button>
      </div>
    </aside>
  );
} 