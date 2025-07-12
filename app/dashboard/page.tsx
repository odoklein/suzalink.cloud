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

export default function DashboardPage() {
  const [stats, setStats] = useState({
    prospects: 0,
    clients: 0,
    income: 0,
    expenses: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchStats() {
      setStats((s) => ({ ...s, loading: true }));
      // Total prospects
      const { count: prospects } = await supabase
        .from("prospects")
        .select("id", { count: "exact", head: true });
      // Total clients
      const { count: clients } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true });
      // Income this month
      const { data: incomeRows } = await supabase
        .from("entries")
        .select("amount, date, type")
        .eq("type", "income");
      // Expenses this month
      const { data: expenseRows } = await supabase
        .from("entries")
        .select("amount, date, type")
        .eq("type", "expense");
      // Calculate sums for current month
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const income = (incomeRows || []).reduce((sum, row) => {
        const d = new Date(row.date);
        return d.getMonth() === month && d.getFullYear() === year ? sum + Number(row.amount) : sum;
      }, 0);
      const expenses = (expenseRows || []).reduce((sum, row) => {
        const d = new Date(row.date);
        return d.getMonth() === month && d.getFullYear() === year ? sum + Number(row.amount) : sum;
      }, 0);
      setStats({
        prospects: prospects || 0,
        clients: clients || 0,
        income,
        expenses,
        loading: false,
      });
    }
    fetchStats();
  }, []);

  const balance = stats.income - stats.expenses;

  return (
    <div className="space-y-8 p-6">
      {/* Key Metrics Grid */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
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
                {stats.loading ? <Skeleton className="h-8 w-16" /> : stats.prospects.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-blue-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+12% from last month</span>
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
                {stats.loading ? <Skeleton className="h-8 w-16" /> : stats.clients.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+5% from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Income Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-purple-700">
                <span>Income</span>
                <CurrencyDollarIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {stats.loading ? <Skeleton className="h-8 w-24" /> : `$${stats.income.toLocaleString()}`}
              </div>
              <div className="flex items-center text-sm text-purple-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+23% from last month</span>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-orange-700">
                <span>Expenses</span>
                <BanknotesIcon className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900 mb-1">
                {stats.loading ? <Skeleton className="h-8 w-24" /> : `$${stats.expenses.toLocaleString()}`}
              </div>
              <div className="flex items-center text-sm text-orange-600">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                <span>+8% from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Card */}
        <Card className="border-[1.5px] border-black/20 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-emerald-700">
              <span>Net Balance</span>
              <CurrencyDollarIcon className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-900 mb-1">
              {stats.loading ? <Skeleton className="h-10 w-32" /> : `$${balance.toLocaleString()}`}
            </div>
            <div className="text-sm text-emerald-600">
              This Month
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Charts Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
        <Card className="border-[1.5px] border-black/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <ChartBarIcon className="h-5 w-5" />
              Income vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Chart coming soon</p>
                <p className="text-xs text-gray-400">Monthly income and expense trends</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex gap-4 flex-wrap">
          <Button className="rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 border-0 shadow-sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button className="rounded-xl bg-pink-100 text-pink-800 hover:bg-pink-200 border-0 shadow-sm">
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Invite Team
          </Button>
          <Button className="rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 shadow-sm">
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <Button className="rounded-xl bg-green-100 text-green-800 hover:bg-green-200 border-0 shadow-sm">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-[1.5px] border-black/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-700">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Project Alpha</div>
                    <div className="text-sm text-gray-500">Due in 10 days</div>
                  </div>
                                     <Badge className="bg-purple-100 text-purple-800">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Project Beta</div>
                    <div className="text-sm text-gray-500">Due in 5 days</div>
                  </div>
                                     <Badge className="bg-yellow-100 text-yellow-800">Review</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] border-black/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-700">Recent Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Client A</div>
                    <div className="text-sm text-gray-500">Added 2 days ago</div>
                  </div>
                                     <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Client B</div>
                    <div className="text-sm text-gray-500">Added 1 week ago</div>
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