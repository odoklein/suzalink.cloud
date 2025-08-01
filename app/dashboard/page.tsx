"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserGroupIcon, 
  UsersIcon, 
  CurrencyDollarIcon, 
  BanknotesIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  UserPlusIcon,
  DocumentArrowUpIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

// Helper to get first and last day of current month
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export default function DashboardPage() {
  // Prospects count
  const { data: prospects, isLoading: loadingProspects } = useQuery({
    queryKey: ["dashboard", "prospectsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("prospects")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Clients count
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["dashboard", "clientsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Income sum for current month
  const { start, end } = getMonthRange();
  const { data: income, isLoading: loadingIncome } = useQuery({
    queryKey: ["dashboard", "incomeSum", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("amount")
        .eq("type", "income")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());
      if (error) throw error;
      return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
    },
  });

  // Expenses sum for current month
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ["dashboard", "expensesSum", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("amount")
        .eq("type", "expense")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString());
      if (error) throw error;
      return (data || []).reduce((sum, row) => sum + Number(row.amount), 0);
    },
  });

  const balance = (income || 0) - (expenses || 0);

  return (
    <div className="space-y-8 p-6">
      {/* Key Metrics Grid */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Vue d'ensemble du tableau de bord</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Prospects Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-blue-700">
                <span>Prospects</span>
                <UserGroupIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {loadingProspects ? <Skeleton className="h-8 w-16" /> : prospects?.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-blue-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+12% par rapport au mois dernier</span>
              </div>
            </CardContent>
          </Card>

          {/* Clients Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-green-700">
                <span>Clients</span>
                <UsersIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 mb-1">
                {loadingClients ? <Skeleton className="h-8 w-16" /> : clients?.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+5% par rapport au mois dernier</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenu Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-purple-700">
                <span>Revenu</span>
                <CurrencyDollarIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {loadingIncome ? <Skeleton className="h-8 w-24" /> : `$${(income || 0).toLocaleString()}`}
              </div>
              <div className="flex items-center text-sm text-purple-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+23% par rapport au mois dernier</span>
              </div>
            </CardContent>
          </Card>

          {/* Dépenses Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-orange-700">
                <span>Dépenses</span>
                <BanknotesIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 mb-1">
                {loadingExpenses ? <Skeleton className="h-8 w-24" /> : `$${(expenses || 0).toLocaleString()}`}
              </div>
              <div className="flex items-center text-sm text-orange-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+8% par rapport au mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Card */}
        <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-emerald-700">
              <span>Solde net</span>
              <CurrencyDollarIcon className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-900 mb-1">
              {(loadingIncome || loadingExpenses) ? <Skeleton className="h-10 w-32" /> : `$${balance.toLocaleString()}`}
            </div>
            <div className="text-sm text-emerald-600">
              Ce mois-ci
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble financière</h3>
        <Card className="border-[1.5px] border-black/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <ChartBarIcon className="h-5 w-5" />
              Revenu vs Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Graphique à venir</p>
                <p className="text-xs text-gray-400">Tendances mensuelles de revenu et de dépenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Actions rapides */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="flex gap-4 flex-wrap">
          <Button className="rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 border-0 shadow-sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nouveau projet
          </Button>
          <Button className="rounded-xl bg-pink-100 text-pink-800 hover:bg-pink-200 border-0 shadow-sm">
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Inviter l’équipe
          </Button>
          <Button className="rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 shadow-sm">
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Téléverser un fichier
          </Button>
          <Button className="rounded-xl bg-green-100 text-green-800 hover:bg-green-200 border-0 shadow-sm">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Voir les rapports
          </Button>
        </div>
      </section>

      {/* Activité récente */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-[1.5px] border-black/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-700">Projets récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Project Alpha</div>
                    <div className="text-sm text-gray-500">Échéance dans 10 jours</div>
                  </div>
                                     <Badge className="bg-purple-100 text-purple-800">En cours</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Project Beta</div>
                    <div className="text-sm text-gray-500">Échéance dans 5 jours</div>
                  </div>
                                     <Badge className="bg-yellow-100 text-yellow-800">À réviser</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] border-black/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-700">Clients récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Client A</div>
                    <div className="text-sm text-gray-500">Ajouté il y a 2 jours</div>
                  </div>
                                     <Badge className="bg-green-100 text-green-800">Actif</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Client B</div>
                    <div className="text-sm text-gray-500">Ajouté il y a 1 semaine</div>
                  </div>
                                     <Badge className="bg-blue-100 text-blue-800">New</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 