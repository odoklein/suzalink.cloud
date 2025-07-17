"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useQuery } from '@tanstack/react-query';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminOnly } from "@/components/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Filter, Plus, MoreVertical, Activity, BarChart2, Clock, Wifi, WifiOff } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

interface UserActivitySummary {
  lastActive: string | null;
  actionsToday: number;
  actionsThisMonth: number;
  isCurrentlyActive?: boolean;
  sessionStartTime?: string;
  sessionDuration?: number; // in minutes
}

interface UserActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
}

export default function UsersPage() {
  const { userProfile, sessionDuration } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);

  // Users paginated
  const {
    data: users = [],
    isLoading: loadingUsers,
    isError: errorUsers,
  } = useQuery<User[], Error>({
    queryKey: ["users", page, pageSize, search, selectedRole],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search) query = query.ilike('full_name', `%${search}%`);
      if (selectedRole) query = query.eq('role', selectedRole);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Batch activity summaries for current page's users
  const userIds = users.map(u => u.id);
  const {
    data: activitySummaries = {},
    isLoading: loadingActivitySummaries,
  } = useQuery<Record<string, UserActivitySummary>>({
    queryKey: ["userActivitySummaries", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      // Fetch last active and counts for all users in a single query
      // Last active
      const { data: lastActiveRows } = await supabase
        .from('user_activity')
        .select('user_id, created_at')
        .in('user_id', userIds);
      // Actions today
      const today = new Date();
      today.setHours(0,0,0,0);
      const { data: todayRows } = await supabase
        .from('user_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', today.toISOString());
      // Actions this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0,0,0,0);
      const { data: monthRows } = await supabase
        .from('user_activity')
        .select('user_id')
        .in('user_id', userIds)
        .gte('created_at', monthStart.toISOString());
      // Build summaries
      const summaries: Record<string, UserActivitySummary> = {};
      for (const id of userIds) {
        // Last active: find max created_at
        const userActs = lastActiveRows?.filter((r: any) => r.user_id === id) || [];
        const lastActive = userActs.length > 0 ? userActs.reduce((max: string, curr: any) => curr.created_at > max ? curr.created_at : max, userActs[0].created_at) : null;
        // Actions today
        const actionsToday = todayRows?.filter((r: any) => r.user_id === id).length || 0;
        // Actions this month
        const actionsThisMonth = monthRows?.filter((r: any) => r.user_id === id).length || 0;
        summaries[id] = {
          lastActive,
          actionsToday,
          actionsThisMonth
        };
      }
      return summaries;
    },
    enabled: userIds.length > 0,
  });

  function formatSessionDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // All legacy state and handlers removed; React Query handles all loading/data.


  // Role update logic can be added here using React Query mutation if needed
  // For now, only display and filtering are supported


  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Admin</Badge>;
      case 'manager':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Manager</Badge>;
      case 'user':
        return <Badge variant="default" className="bg-gray-100 text-gray-800 border-gray-200">User</Badge>;
      default:
        return <Badge variant="default">User</Badge>;
    }
  };

  // Filtering is handled by React Query search param
  const filteredUsers = users; // No local filtering needed

  return (
    <AdminOnly>
      <div className="w-full px-0 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User management</h1>
            <p className="text-gray-600 mt-1">Manage your team members and their account permissions here.</p>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Input
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" className="flex gap-2"><Filter className="w-4 h-4" /> Filters</Button>
            <Button className="flex gap-2"><Plus className="w-4 h-4" /> Add user</Button>
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><input type="checkbox" aria-label="Select all" /></TableHead>
                <TableHead>User name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>This month</TableHead>
                <TableHead>Date added</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-400">No users found.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const summary = activitySummaries[user.id];
                  const isCurrentUser = user.id === userProfile?.id;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell><input type="checkbox" aria-label={`Select ${user.full_name}`} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-gray-500 text-sm">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {summary?.isCurrentlyActive ? (
                            <>
                              <Wifi className="w-4 h-4 text-green-500" />
                              <span className="text-green-600 text-sm font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500 text-sm">Inactive</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCurrentUser && sessionDuration > 0 ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-600 text-sm font-medium">
                              {formatSessionDuration(sessionDuration)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {loadingActivitySummaries ? <Skeleton className="h-5 w-20" /> : summary?.lastActive ? new Date(summary.lastActive).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-center">
                        {loadingActivitySummaries ? <Skeleton className="h-5 w-10" /> : summary?.actionsToday ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-center">
                        {loadingActivitySummaries ? <Skeleton className="h-5 w-10" /> : summary?.actionsThisMonth ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-500">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {/* Action buttons removed: View Activity and Edit Role dialogs are obsolete in this refactor */}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminOnly>
  );
}