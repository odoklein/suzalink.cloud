"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  UsersIcon, 
  UserPlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  LinkIcon,
  UserIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { UserProfile } from "@/app/types/user";
import { toast } from "sonner";
import UserActivityChart from "./components/UserActivityChart";
import UserEditModal from "./components/UserEditModal";
import UserCreateModal from "./components/UserCreateModal";
import { ActivityHelpers } from "@/lib/activity-logger";

interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  target_user_id?: string;
}

interface UserStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  manager_users: number;
  regular_users: number;
  new_users_this_month: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UtilisateursPage() {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ["users", currentPage, searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        role: roleFilter,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      const response = await fetch(`/api/users/management?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const users = usersData?.users || [];
  const pagination: PaginationInfo = usersData?.pagination || {
    page: currentPage,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0
  };

  // Fetch user statistics
  const { data: userStats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data: users } = await supabase.from("users").select("role, created_at");
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats: UserStats = {
        total_users: users?.length || 0,
        active_users: users?.filter(u => u.created_at >= thisMonth.toISOString()).length || 0,
        admin_users: users?.filter(u => u.role === "admin").length || 0,
        manager_users: users?.filter(u => u.role === "manager").length || 0,
        regular_users: users?.filter(u => u.role === "user").length || 0,
        new_users_this_month: users?.filter(u => new Date(u.created_at) >= thisMonth).length || 0,
      };
      
      return stats;
    },
  });

  // Fetch user activity
  const { data: userActivity } = useQuery({
    queryKey: ["user-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity')
        .select(`
          *,
          user:users!user_activity_user_id_fkey(full_name, email),
          target_user:users!user_activity_target_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching user activity:', error);
        return [];
      }
      return data as (UserActivity & {
        user: { full_name: string; email: string };
        target_user?: { full_name: string; email: string };
      })[];
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/management?userId=${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Utilisateur supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      setShowDeleteModal(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const promises = userIds.map(userId => 
        fetch(`/api/users/management?userId=${userId}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast.success(`${selectedUsers.length} utilisateurs supprimés avec succès`);
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la suppression en masse: ${error.message}`);
    },
  });

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheckIcon className="w-4 h-4" />;
      case "manager":
        return <UsersIcon className="w-4 h-4" />;
      case "user":
        return <UserIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleViewUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserModal(true);
    
    // Log profile view activity
    try {
      await ActivityHelpers.logProfileViewed(
        session?.user?.id || '',
        user.id,
        user.full_name
      );
      // Refresh activity data
      queryClient.invalidateQueries({ queryKey: ["user-activity"] });
    } catch (error) {
      console.error('Error logging profile view:', error);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedUsers.length > 0) {
      bulkDeleteMutation.mutate(selectedUsers);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user: UserProfile) => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedUsers([]);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleUserSave = (updatedUser: UserProfile) => {
    setShowEditModal(false);
    setSelectedUser(null);
    refetch();
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <UsersIcon className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
              <p className="text-gray-600 mt-2 text-lg">
                Gérez les utilisateurs, leurs rôles et suivez leur activité
              </p>
            </div>
          </div>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 font-medium rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlusIcon className="w-5 h-5" />
            Ajouter un utilisateur
          </Button>
        </div>
      </section>

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Utilisateurs</p>
                <p className="text-3xl font-bold text-gray-900">{userStats?.total_users || 0}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <UsersIcon className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisateurs Actifs</p>
                <p className="text-3xl font-bold text-gray-900">{userStats?.active_users || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <ChartBarIcon className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administrateurs</p>
                <p className="text-3xl font-bold text-gray-900">{userStats?.admin_users || 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <ShieldCheckIcon className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nouveaux ce mois</p>
                <p className="text-3xl font-bold text-gray-900">{userStats?.new_users_this_month || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <CalendarIcon className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Search and Filter Section */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 py-3 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-lg rounded-lg transition-all duration-200"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg transition-all duration-200"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">Administrateurs</option>
              <option value="manager">Managers</option>
              <option value="user">Utilisateurs</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 px-6 py-3 transition-all duration-200">
              <FunnelIcon className="w-5 h-5" />
              Filtres avancés
            </Button>
          </div>
        </div>
      </section>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckIcon className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-800 font-medium">
                {selectedUsers.length} utilisateur(s) sélectionné(s)
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedUsers([])}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 transition-all duration-200"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 transition-all duration-200"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Supprimer ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Users List */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-gray-900 text-xl font-semibold">
              <UsersIcon className="w-6 h-6 text-gray-600" />
              Liste des Utilisateurs ({pagination.total})
            </CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-gray-600 mt-3">Chargement des utilisateurs...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
              <p className="text-gray-600 mb-4">Aucun utilisateur ne correspond à vos critères de recherche.</p>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Ajouter le premier utilisateur
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {users.map((user: UserProfile) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 transition-all duration-200"
                        />
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                            {user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{user.full_name}</h3>
                            <Badge className={`${getRoleBadgeColor(user.role)} transition-all duration-200`}>
                              <div className="flex items-center gap-1">
                                {getRoleIcon(user.role)}
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </div>
                            </Badge>
                          </div>
                          <p className="text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              Inscrit le {formatDate(user.created_at)}
                            </span>
                            {user.job_title && (
                              <span className="flex items-center gap-1">
                                <UsersIcon className="w-3 h-3" />
                                {user.job_title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          className="flex items-center gap-1 border-gray-300 hover:bg-gray-50 px-3 py-1.5 transition-all duration-200"
                        >
                          <EyeIcon className="w-3 h-3" />
                          Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="flex items-center gap-1 border-gray-300 hover:bg-gray-50 px-3 py-1.5 transition-all duration-200"
                        >
                          <PencilIcon className="w-3 h-3" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 px-3 py-1.5 transition-all duration-200"
                        >
                          <TrashIcon className="w-3 h-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Affichage de {((pagination.page - 1) * pagination.limit) + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} utilisateurs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Précédent
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={page === pagination.page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className={page === pagination.page ? "bg-emerald-600 hover:bg-emerald-700" : "border-gray-300 hover:bg-gray-50 transition-all duration-200"}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                      >
                        Suivant
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </section>

      {/* User Activity Chart */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <UserActivityChart />
      </section>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Détails de l'utilisateur</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserModal(false)}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Fermer
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-medium">
                    {selectedUser.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedUser.full_name}</h3>
                  <Badge className={`mt-2 ${getRoleBadgeColor(selectedUser.role)}`}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(selectedUser.role)}
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </div>
                  </Badge>
                </div>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{selectedUser.email}</p>
                    </div>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center gap-4">
                      <PhoneIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Téléphone</p>
                        <p className="font-medium text-gray-900">{selectedUser.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedUser.location && (
                    <div className="flex items-center gap-4">
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Localisation</p>
                        <p className="font-medium text-gray-900">{selectedUser.location}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {selectedUser.job_title && (
                    <div className="flex items-center gap-4">
                      <UsersIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Poste</p>
                        <p className="font-medium text-gray-900">{selectedUser.job_title}</p>
                      </div>
                    </div>
                  )}
                  {selectedUser.department && (
                    <div className="flex items-center gap-4">
                      <UsersIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Département</p>
                        <p className="font-medium text-gray-900">{selectedUser.department}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Membre depuis</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedUser.bio && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Biographie</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed">{selectedUser.bio}</p>
                </div>
              )}

              {/* Social Links */}
              {(selectedUser.linkedin_url || selectedUser.website_url) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Liens sociaux</h4>
                  <div className="flex gap-3">
                    {selectedUser.linkedin_url && (
                      <Button variant="outline" className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 transition-all duration-200">
                        <LinkIcon className="w-4 h-4" />
                        LinkedIn
                      </Button>
                    )}
                    {selectedUser.website_url && (
                      <Button variant="outline" className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 transition-all duration-200">
                        <GlobeAltIcon className="w-4 h-4" />
                        Site web
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Activité récente</h4>
                <div className="space-y-3">
                  {userActivity?.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{activity.details}</p>
                          {activity.user && (
                            <span className="text-sm text-gray-500">par {activity.user.full_name}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{formatDate(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {(!userActivity || userActivity.length === 0) && (
                    <div className="text-center py-6 text-gray-500">
                      <p>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUserModal(false)} className="border-gray-300 hover:bg-gray-50 px-4 py-2 transition-all duration-200">
                Fermer
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 transition-all duration-200"
                onClick={() => {
                  setShowUserModal(false);
                  handleEditUser(selectedUser);
                }}
              >
                Modifier l'utilisateur
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Modifier l'utilisateur</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Fermer
                </Button>
              </div>
            </div>
            <div className="p-6">
              <UserEditModal
                user={selectedUser}
                isOpen={showEditModal}
                onClose={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                onSave={handleUserSave}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <UserCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Confirmer la suppression</h3>
                  <p className="text-gray-600 mt-1">Cette action ne peut pas être annulée.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete.full_name}</strong> ? 
                Toutes les données associées seront définitivement supprimées.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleteUserMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 transition-all duration-200"
                >
                  {deleteUserMutation.isPending ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 