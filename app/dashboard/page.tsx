"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowTrendingUpIcon,
  CalendarIcon,
  FolderIcon,
  UsersIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useNextAuth } from "@/lib/nextauth-context";
import { SessionInfo } from "@/components/SessionStatus";
import Link from "next/link";



// Helper to get greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardPage() {
  const { user, loading } = useNextAuth();

  // Show loading state if auth is still loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur d&apos;authentification</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Salutation Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
              <HomeIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getGreeting()}, {user?.name || user?.email?.split('@')[0] || 'Utilisateur'} !
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Bienvenue dans votre espace de travail. Voici un aperçu de votre activité aujourd'hui.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SessionInfo />
          </div>
        </div>
      </section>

      {/* Quick Access Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès rapide</h2>
          <p className="text-gray-600">Accédez rapidement aux fonctionnalités principales</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Projects Quick Access */}
          <Link href="/dashboard/projects">
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer select-none active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-purple-300/50">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/30 to-pink-500/30 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <FolderIcon className="h-8 w-8 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                  <ArrowTrendingUpIcon className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:translate-y-[-2px] transition-transform duration-300">Projets</h3>
                <p className="text-purple-100 text-sm group-hover:translate-y-[-1px] transition-transform duration-300">Suivez vos projets</p>
              </CardContent>
            </Card>
          </Link>

          {/* Clients Dashboard Quick Access */}
          <Link href="/dashboard/clients/dashboard">
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer select-none active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-300/50">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-teal-500/30 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <UsersIcon className="h-8 w-8 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                  <ArrowTrendingUpIcon className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:translate-y-[-2px] transition-transform duration-300">Clients</h3>
                <p className="text-emerald-100 text-sm group-hover:translate-y-[-1px] transition-transform duration-300">Gérez vos clients</p>
              </CardContent>
            </Card>
          </Link>

          {/* Calendrier Quick Access */}
          <Link href="/dashboard/bookings">
            <Card className="group relative overflow-hidden border-0 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer select-none active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-orange-300/50">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-red-500/30 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <CalendarIcon className="h-8 w-8 text-white/90 group-hover:scale-110 transition-transform duration-300" />
                  <ArrowTrendingUpIcon className="h-5 w-5 text-white/70 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:translate-y-[-2px] transition-transform duration-300">Calendrier</h3>
                <p className="text-orange-100 text-sm group-hover:translate-y-[-1px] transition-transform duration-300">Gérez vos rendez-vous</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>






    </div>
  );
} 