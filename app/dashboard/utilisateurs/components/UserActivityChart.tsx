"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "@heroicons/react/24/outline";

interface ActivityData {
  date: string;
  logins: number;
  emails_sent: number;
  projects_created: number;
  clients_contacted: number;
}

interface UserActivityChartProps {
  userId?: string;
  timeRange?: "7d" | "30d" | "90d";
}

export default function UserActivityChart({ userId, timeRange = "30d" }: UserActivityChartProps) {
  const [selectedRange, setSelectedRange] = useState(timeRange);

  // Mock activity data - in real app, this would come from API
  const activityData: ActivityData[] = [
    { date: "2024-01-01", logins: 5, emails_sent: 12, projects_created: 2, clients_contacted: 8 },
    { date: "2024-01-02", logins: 3, emails_sent: 8, projects_created: 1, clients_contacted: 5 },
    { date: "2024-01-03", logins: 7, emails_sent: 15, projects_created: 3, clients_contacted: 12 },
    { date: "2024-01-04", logins: 4, emails_sent: 10, projects_created: 2, clients_contacted: 7 },
    { date: "2024-01-05", logins: 6, emails_sent: 18, projects_created: 4, clients_contacted: 15 },
    { date: "2024-01-06", logins: 2, emails_sent: 6, projects_created: 1, clients_contacted: 3 },
    { date: "2024-01-07", logins: 8, emails_sent: 22, projects_created: 5, clients_contacted: 18 },
  ];

  const totalLogins = activityData.reduce((sum, day) => sum + day.logins, 0);
  const totalEmails = activityData.reduce((sum, day) => sum + day.emails_sent, 0);
  const totalProjects = activityData.reduce((sum, day) => sum + day.projects_created, 0);
  const totalClients = activityData.reduce((sum, day) => sum + day.clients_contacted, 0);

  const avgLoginsPerDay = Math.round(totalLogins / activityData.length);
  const avgEmailsPerDay = Math.round(totalEmails / activityData.length);

  const getActivityTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      icon: change >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />
    };
  };

  const loginTrend = getActivityTrend(avgLoginsPerDay, 4);
  const emailTrend = getActivityTrend(avgEmailsPerDay, 12);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Activité utilisateur</h3>
        <div className="flex gap-2">
          {[
            { value: "7d", label: "7 jours" },
            { value: "30d", label: "30 jours" },
            { value: "90d", label: "90 jours" }
          ].map((range) => (
            <Button
              key={range.value}
              variant={selectedRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRange(range.value as any)}
              className={`transition-all duration-200 ${
                selectedRange === range.value 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connexions</p>
                <p className="text-2xl font-bold text-gray-900">{totalLogins}</p>
                <div className="flex items-center gap-1 mt-1">
                  {loginTrend.icon}
                  <span className={`text-xs font-medium ${loginTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {loginTrend.value}%
                  </span>
                  <span className="text-xs text-gray-500">vs période précédente</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <ClockIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails envoyés</p>
                <p className="text-2xl font-bold text-gray-900">{totalEmails}</p>
                <div className="flex items-center gap-1 mt-1">
                  {emailTrend.icon}
                  <span className={`text-xs font-medium ${emailTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {emailTrend.value}%
                  </span>
                  <span className="text-xs text-gray-500">vs période précédente</span>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projets créés</p>
                <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
                <p className="text-xs text-gray-500 mt-1">Cette période</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clients contactés</p>
                <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                <p className="text-xs text-gray-500 mt-1">Cette période</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-gray-900 font-semibold">
            <ChartBarIcon className="w-5 h-5 text-gray-600" />
            Activité quotidienne
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {activityData.map((day, index) => (
              <div key={day.date} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                <div className="w-20 text-sm font-medium text-gray-600">
                  {new Date(day.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })}
                </div>
                
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{day.logins}</div>
                    <div className="text-xs text-gray-500">Connexions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{day.emails_sent}</div>
                    <div className="text-xs text-gray-500">Emails</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{day.projects_created}</div>
                    <div className="text-xs text-gray-500">Projets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">{day.clients_contacted}</div>
                    <div className="text-xs text-gray-500">Clients</div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Badge className="text-xs border border-gray-300 bg-white text-gray-700 transition-all duration-200">
                    {day.logins + day.emails_sent + day.projects_created + day.clients_contacted} actions
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Insights */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <CardTitle className="text-gray-900 font-semibold">Insights d'activité</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Points forts</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Engagement élevé</p>
                    <p className="text-xs text-green-600">Moyenne de {avgLoginsPerDay} connexions par jour</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Communication active</p>
                    <p className="text-xs text-blue-600">Moyenne de {avgEmailsPerDay} emails par jour</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Recommandations</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Diversifier les activités</p>
                    <p className="text-xs text-yellow-600">Augmenter les interactions avec les clients</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors duration-200">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Maintenir la régularité</p>
                    <p className="text-xs text-purple-600">Continuer le rythme de connexion actuel</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 