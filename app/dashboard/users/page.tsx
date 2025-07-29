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
import { Badge } from "@/components/ui/badge";
import EditUserEmailCredentialsModal from "@/components/EditUserEmailCredentialsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Filter, Plus, MoreVertical, Activity, BarChart2, Clock, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2 } from "lucide-react";

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

interface UserActivityModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
  activityLogs: UserActivityLog[];
}

function UserActivityModal({ user, open, onClose, activityLogs }: UserActivityModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.full_name}'s Activity</DialogTitle>
          <DialogDescription>
            Detailed view of recent user actions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <div key={log.id} className="border-b pb-2 last:border-0">
                <div className="flex justify-between">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                {log.details && (
                  <pre className="text-sm text-muted-foreground mt-1 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-4">No activity found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const { userProfile, sessionDuration } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [viewingActivityUserId, setViewingActivityUserId] = useState<string | null>(null);

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
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search) query = query.ilike('full_name', `%${search}%`);
      if (selectedRole && selectedRole !== 'all') query = query.eq('role', selectedRole);
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

  // Mock activity logs - replace with real data
  const activityLogs: UserActivityLog[] = [
    {
      id: "1",
      action: "Logged in",
      details: { ip: "192.168.1.1", device: "Chrome on Windows" },
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      action: "Updated profile",
      details: { fields: ["email", "phone"] },
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  return (
    <>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all registered users and their permissions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users?.length || 0}</p>
            </div>
            <Activity className="h-6 w-6 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Today</p>
              <p className="text-2xl font-bold">
                {users?.filter(u => activitySummaries[u.id]?.isCurrentlyActive).length || 0}
              </p>
            </div>
            <Wifi className="h-6 w-6 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">New This Month</p>
              <p className="text-2xl font-bold">
                {users?.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0}
              </p>
            </div>
            <BarChart2 className="h-6 w-6 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingUsers ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-400">Aucun utilisateur trouvé.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const summary = activitySummaries[user.id];
                const isCurrentUser = user.id === userProfile?.id;
                
                return (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {user.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {user.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'draft'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {summary?.isCurrentlyActive ? (
                        <div className="flex items-center gap-1">
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <WifiOff className="h-4 w-4 text-muted-foreground" />
                          <span>Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setViewingActivityUserId(user.id)}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingUserId(user.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    {viewingActivityUserId && (
      <UserActivityModal
        user={users.find(u => u.id === viewingActivityUserId)!}
        open={!!viewingActivityUserId}
        onClose={() => setViewingActivityUserId(null)}
        activityLogs={activityLogs}
      />
    )}
    {editingUserId && (
      <EditUserEmailCredentialsModal
        userId={editingUserId}
        open={!!editingUserId}
        onClose={() => setEditingUserId(null)}
        userEmail={users.find(u => u.id === editingUserId)?.email || ''}
      />
    )}
    </>
  );
}