"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Target, Calendar } from "lucide-react";

interface AnalyticsData {
  totalProspects: number;
  prospectsByStatus: Record<string, number>;
  prospectsByUser: Array<{
    userId: string;
    userName: string;
    total: number;
    byStatus: Record<string, number>;
  }>;
  prospectsByList: Array<{
    listId: string;
    listName: string;
    total: number;
    byStatus: Record<string, number>;
  }>;
}

interface AnalyticsDashboardProps {
  listId?: string;
}

export function AnalyticsDashboard({ listId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [listId]);

  const fetchAnalytics = async () => {
    try {
      const url = listId ? `/api/prospects/analytics?listId=${listId}` : '/api/prospects/analytics';
      const res = await fetch(url);
      const data = await res.json();

      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const statusColors = {
    '': 'bg-gray-100 text-gray-800',
    'NRP': 'bg-gray-100 text-gray-800',
    'Rappel': 'bg-purple-100 text-purple-800',
    'Relance': 'bg-orange-100 text-orange-800',
    'Mail': 'bg-blue-100 text-blue-800',
    'pas interessé': 'bg-red-100 text-red-800',
    'barrage': 'bg-red-200 text-red-900',
    'devis': 'bg-green-100 text-green-800',
    'rdv': 'bg-emerald-100 text-emerald-800'
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProspects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.prospectsByStatus[''] || analytics.prospectsByStatus['none'] || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.prospectsByStatus.ferme || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalProspects > 0
                ? Math.round(((analytics.prospectsByStatus.ferme || 0) / analytics.totalProspects) * 100)
                : 0
              }%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Statut</CardTitle>
          <CardDescription>Nombre de prospects par statut</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analytics.prospectsByStatus).map(([status, count]) => (
              <Badge key={status} className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                {status}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance by Team Member */}
      {analytics.prospectsByUser.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance par Commercial</CardTitle>
            <CardDescription>Nombre de prospects gérés par chaque membre de l'équipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.prospectsByUser.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{user.userName}</div>
                    <div className="text-sm text-muted-foreground">Total: {user.total}</div>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(user.byStatus).map(([status, count]) => (
                      <Badge key={status} variant="secondary" className="text-xs">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance by List */}
      {analytics.prospectsByList.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance par Liste</CardTitle>
            <CardDescription>Nombre de prospects par liste</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.prospectsByList.map((list) => (
                <div key={list.listId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{list.listName}</div>
                    <div className="text-sm text-muted-foreground">Total: {list.total}</div>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(list.byStatus).map(([status, count]) => (
                      <Badge key={status} variant="outline" className="text-xs">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

