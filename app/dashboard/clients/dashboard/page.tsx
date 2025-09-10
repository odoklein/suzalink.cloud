"use client";
import { useNextAuth } from "@/lib/nextauth-context";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  Clock,
  UserPlus,
  Plus,
  ArrowRight,
  Activity,
  Award,
  MapPin
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
  const { user } = useNextAuth();

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

  // Fetch recent client activity
  const { data: recentActivity, isLoading: loadingActivity } = useQuery<ClientActivity[]>({
    queryKey: ["client-dashboard", "activity"],
    queryFn: async () => {
      const { data: recentClients } = await supabase
        .from("clients")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

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

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Gérez vos clients et suivez leur activité</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/clients">
              <Button variant="outline" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Voir tous
              </Button>
            </Link>
            <Link href="/dashboard/clients">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouveau client
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics - Simplified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Clients */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {clientStats?.total || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-3 text-sm">
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
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Actifs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {clientStats?.active || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                {clientStats?.total ? `${((clientStats.active / clientStats.total) * 100).toFixed(1)}%` : "0%"} du total
              </div>
            </CardContent>
          </Card>

          {/* Pending Clients */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {clientStats?.pending || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Nécessitent un suivi
              </div>
            </CardContent>
          </Card>

          {/* New This Month */}
          <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nouveaux</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {clientStats?.newThisMonth || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Ce mois
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Clients - Simplified */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Award className="h-5 w-5 text-blue-600" />
                    Top Clients
                  </CardTitle>
                  <Link href="/dashboard/clients">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      Voir tout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topClients?.slice(0, 3).map((client: TopClient, index: number) => (
                      <div key={client.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
          </div>

          {/* Recent Activity - Simplified */}
          <div>
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Activité
                  </CardTitle>
                  <Link href="/dashboard/clients">
                    <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                      Voir tout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity?.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{activity.name}</div>
                          <div className="text-sm text-gray-600">{activity.action}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions - Simplified */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/clients">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <Users className="h-4 w-4" />
                  Gérer les clients
                </Button>
              </Link>
              <Link href="/dashboard/projects">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <Award className="h-4 w-4" />
                  Voir les projets
                </Button>
              </Link>
              <Link href="/dashboard/invoices">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <Activity className="h-4 w-4" />
                  Factures
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 