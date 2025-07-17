"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [activitySummaries, setActivitySummaries] = useState<Record<string, UserActivitySummary>>({});
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityUser, setActivityUser] = useState<User | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      fetchActivitySummaries();
    }
  }, [users]);

  function formatSessionDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch users');
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function fetchActivitySummaries() {
    setActivityLoading(true);
    const summaries: Record<string, UserActivitySummary> = {};
    for (const user of users) {
      // Fetch last active
      let last = null;
      let lastError = null;
      try {
        const { data, error } = await supabase
          .from("user_activity")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) lastError = error;
        if (Array.isArray(data) && data.length > 0) last = data[0];
      } catch (e) {
        lastError = e;
      }
      
      // Check if user is currently active (has activity in last 5 minutes)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      const { data: recentActivity } = await supabase
        .from("user_activity")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", fiveMinutesAgo.toISOString())
        .limit(1);
      
      const isCurrentlyActive = recentActivity && recentActivity.length > 0;
      
      // Fetch actions today
      const today = new Date();
      today.setHours(0,0,0,0);
      const { count: todayCount } = await supabase
        .from("user_activity")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());
      
      // Fetch actions this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0,0,0,0);
      const { count: monthCount } = await supabase
        .from("user_activity")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());
      
      summaries[user.id] = {
        lastActive: last?.created_at || null,
        actionsToday: todayCount || 0,
        actionsThisMonth: monthCount || 0,
        isCurrentlyActive: isCurrentlyActive || false,
      };
    }
    setActivitySummaries(summaries);
    setActivityLoading(false);
  }

  async function openUserActivity(user: User) {
    setActivityDialogOpen(true);
    setActivityUser(user);
    setActivityLogs([]);
    // Fetch activity logs
    const { data, error } = await supabase
      .from("user_activity")
      .select("id, action, details, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      setActivityLogs(data);
    }
  }

  async function addTestActivity() {
    if (!userProfile) return;
    setTestLoading(true);
    try {
      // Add some test activity for the current user
      const testActions = [
        'login',
        'view_dashboard',
        'view_users',
        'test_action_1',
        'test_action_2'
      ];
      
      for (const action of testActions) {
        await supabase.from("user_activity").insert([
          {
            user_id: userProfile.id,
            action,
            details: { test: true, timestamp: new Date().toISOString() }
          }
        ]);
      }
      
      toast.success('Test activity added! Refresh to see changes.');
      // Refresh activity data
      await fetchActivitySummaries();
    } catch (error) {
      toast.error('Failed to add test activity');
      console.error('Error adding test activity:', error);
    } finally {
      setTestLoading(false);
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'manager' | 'user') => {
    setUpdating(true);
    if (userId === userProfile?.id) {
      toast.error('You cannot change your own role');
      setUpdating(false);
      return;
    }
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) {
      toast.error('Failed to update user role');
      console.error('Error updating user role:', error);
    } else {
      toast.success('User role updated successfully');
      setOpen(false);
      setEditingUser(null);
      // Update the role in the local state immediately
      setUsers((prev) => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setUpdating(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Administrateur</Badge>;
      case 'manager':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Gestionnaire</Badge>;
      case 'user':
        return <Badge variant="default" className="bg-gray-100 text-gray-800 border-gray-200">Utilisateur</Badge>;
      default:
        return <Badge variant="default">User</Badge>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminOnly>
      <div className="w-full px-0 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-gray-600 mt-1">Gérez les membres de votre équipe et leurs autorisations ici.</p>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Input
              placeholder="Rechercher"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" className="flex gap-2"><Filter className="w-4 h-4" /> Filtres</Button>
            <Button 
              variant="outline" 
              onClick={addTestActivity}
              disabled={testLoading}
              className="flex gap-2"
            >
              <Plus className="w-4 h-4" /> {testLoading ? 'Ajout en cours...' : 'Ajouter activité de test'}
            </Button>
            <Button className="flex gap-2"><Plus className="w-4 h-4" /> Ajouter un utilisateur</Button>
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><input type="checkbox" aria-label="Select all" /></TableHead>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead>Aujourd'hui</TableHead>
                <TableHead>Ce mois</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
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
                  <TableCell colSpan={10} className="text-center py-8 text-gray-400">Aucun utilisateur trouvé.</TableCell>
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
                              <span className="text-green-600 text-sm font-medium">Actif</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-500 text-sm">Inactif</span>
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
                        {activityLoading ? <Skeleton className="h-5 w-20" /> : summary?.lastActive ? new Date(summary.lastActive).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-center">
                        {activityLoading ? <Skeleton className="h-5 w-10" /> : summary?.actionsToday ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 text-center">
                        {activityLoading ? <Skeleton className="h-5 w-10" /> : summary?.actionsThisMonth ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-500">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUserActivity(user)}
                          >
                            <Activity className="w-4 h-4 mr-1" /> Voir l'activité
                          </Button>
                          {user.id !== userProfile?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setOpen(true);
                              }}
                            >
                              Modifier le rôle
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Activité de l'utilisateur</DialogTitle>
              <DialogDescription>
                Journal d'activité de {activityUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activityLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">Aucune activité trouvée.</div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3 flex flex-col gap-1 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{log.action}</span>
                      <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.details && (
                      <pre className="text-xs text-gray-600 bg-gray-100 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le rôle de l'utilisateur</DialogTitle>
              <DialogDescription>
                Changer le rôle pour {editingUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: 'admin' | 'manager' | 'user') => {
                    setSelectedRole(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="manager">Gestionnaire</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setEditingUser(null);
                  }}
                  disabled={updating}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => {
                    if (editingUser && selectedRole && selectedRole !== editingUser.role) {
                      handleUpdateRole(editingUser.id, selectedRole as 'admin' | 'manager' | 'user');
                    }
                  }}
                  disabled={updating || !editingUser || selectedRole === editingUser?.role}
                >
                  {updating ? 'Saving...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
} 