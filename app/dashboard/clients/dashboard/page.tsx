"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Users, 
  Building, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  MapPin,
  Mail,
  Phone,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserPlus,
  Folder,
  List
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import Link from "next/link";

interface ClientStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  newThisMonth: number;
  growthRate: number;
}

interface ClientActivity {
  id: string;
  name: string;
  action: string;
  timestamp: string;
  type: 'created' | 'updated' | 'project_added' | 'invoice_sent';
}

interface TopClient {
  id: string;
  name: string;
  company: string;
  projects_count: number;
  total_revenue: number;
  status: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
    {status === 'active' ? 'Actif' : 
     status === 'pending' ? 'En attente' : 
     status === 'inactive' ? 'Inactif' : status}
  </span>
);

export default function ClientDashboardPage() {
  const { user } = useAuth();

  // Fetch client statistics
  const { data: dashboardData, isLoading: loadingStats } = useQuery({
    queryKey: ["client-dashboard", "stats"],
    queryFn: async () => {
      const response = await fetch('/api/clients/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch client statistics');
      }
      return response.json();
    },
    enabled: !!user
  });

  const clientStats = dashboardData?.stats;
  const topClients = dashboardData?.topClients;
  const clientsByRegion = dashboardData?.regionalDistribution;

  // Fetch recent client activity
  const { data: recentActivity, isLoading: loadingActivity } = useQuery<ClientActivity[]>({
    queryKey: ["client-dashboard", "activity"],
    queryFn: async () => {
      // For now, we'll simulate activity data
      // In a real implementation, you'd have a separate activity log table
      const { data: recentClients } = await supabase
        .from("clients")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      return (recentClients || []).map(client => ({
        id: client.id,
        name: client.name,
        action: "Client créé",
        timestamp: client.created_at,
        type: 'created' as const
      }));
    },
    enabled: !!user
  });

  const loadingTopClients = loadingStats;
  const loadingRegion = loadingStats;

  if (loadingStats) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord Clients</h1>
          <p className="text-gray-600">Vue d'ensemble de vos clients et de leur activité</p>
        </div>
        <Link href="/dashboard/clients">
          <Button className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gérer les Clients
          </Button>
        </Link>
      </div>

      {/* Key Metrics Grid */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Métriques Clés</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Clients */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Total Clients</span>
                <Users className="h-5 w-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {clientStats?.total || 0}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                {clientStats?.growthRate && clientStats.growthRate > 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                )}
                <span className={clientStats?.growthRate && clientStats.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                  {clientStats?.growthRate ? `${clientStats.growthRate.toFixed(1)}%` : "0%"} ce mois
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Active Clients */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Clients Actifs</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {clientStats?.active || 0}
              </div>
              <div className="text-sm text-gray-600">
                {clientStats?.total ? `${((clientStats.active / clientStats.total) * 100).toFixed(1)}%` : "0%"} du total
              </div>
            </CardContent>
          </Card>

          {/* Pending Clients */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>En Attente</span>
                <Clock className="h-5 w-5 text-yellow-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {clientStats?.pending || 0}
              </div>
              <div className="text-sm text-gray-600">
                Nécessitent un suivi
              </div>
            </CardContent>
          </Card>

          {/* New This Month */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Nouveaux ce Mois</span>
                <UserPlus className="h-5 w-5 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {clientStats?.newThisMonth || 0}
              </div>
              <div className="text-sm text-gray-600">
                Acquisitions récentes
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Clients */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Award className="h-5 w-5 text-blue-600" />
              Top Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTopClients ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {topClients?.map((client: TopClient, index: number) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-600">{client.company}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{client.projects_count} projets</div>
                      <StatusBadge status={client.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients by Region */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-green-600" />
              Répartition par Région
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRegion ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {clientsByRegion?.map((item: { region: string; count: number }) => (
                  <div key={item.region} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700">{item.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.count / (clientStats?.total || 1)) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-purple-600" />
            Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity?.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{activity.name}</div>
                    <div className="text-sm text-gray-600">{activity.action}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

             {/* Assigned Folders and Lists */}
       <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
             <Folder className="h-5 w-5 text-blue-600" />
             Dossiers et Listes Assignés
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Assigned Folders */}
             <div>
               <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                 <Folder className="h-4 w-4 text-blue-600" />
                 Dossiers de Prospection
               </h4>
               {dashboardData?.folders && dashboardData.folders.length > 0 ? (
                 <div className="space-y-2">
                   {dashboardData.folders.map((folder: any) => (
                     <div key={folder.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                       <div className="flex items-center gap-2">
                         <Folder className="h-4 w-4 text-blue-600" />
                         <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                       </div>
                       <Link href={`/dashboard/prospects/${folder.id}`}>
                         <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                           Voir
                         </Button>
                       </Link>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-4 text-gray-500">
                   <Folder className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                   <p className="text-sm">Aucun dossier assigné</p>
                 </div>
               )}
             </div>

             {/* Assigned Lists */}
             <div>
               <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                 <List className="h-4 w-4 text-green-600" />
                 Listes de Prospects
               </h4>
               {dashboardData?.lists && dashboardData.lists.length > 0 ? (
                 <div className="space-y-2">
                   {dashboardData.lists.map((list: any) => (
                     <div key={list.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                       <div className="flex items-center gap-2">
                         <List className="h-4 w-4 text-green-600" />
                         <span className="text-sm font-medium text-gray-900">{list.name}</span>
                       </div>
                       <Link href={`/dashboard/prospects/${list.folder_id}/${list.id}`}>
                         <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                           Voir
                         </Button>
                       </Link>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-4 text-gray-500">
                   <List className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                   <p className="text-sm">Aucune liste assignée</p>
                 </div>
               )}
             </div>
           </div>
         </CardContent>
       </Card>

       {/* Quick Actions */}
       <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
         <CardHeader>
           <CardTitle className="text-lg font-semibold text-gray-900">Actions Rapides</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Link href="/dashboard/clients">
               <Button className="w-full justify-start gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                 <Users className="h-4 w-4" />
                 Voir tous les clients
               </Button>
             </Link>
             <Link href="/dashboard/projects">
               <Button className="w-full justify-start gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200">
                 <Building className="h-4 w-4" />
                 Gérer les projets
               </Button>
             </Link>
             <Link href="/dashboard/finance">
               <Button className="w-full justify-start gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200">
                 <BarChart3 className="h-4 w-4" />
                 Voir les finances
               </Button>
             </Link>
           </div>
         </CardContent>
       </Card>
    </div>
  );
} 