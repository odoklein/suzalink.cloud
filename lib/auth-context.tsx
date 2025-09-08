"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user' | 'commercial' | 'dev';
  created_at: string;
  profile_picture_url?: string; // Optional profile picture URL
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasRole: (role: 'admin' | 'manager' | 'user' | 'commercial' | 'dev') => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isDev: () => boolean;
  isCommercial: () => boolean;
  canAccessClients: () => boolean;
  canAccessInvoices: () => boolean;
  canAccessUserManagement: () => boolean;
  canAccessProspects: () => boolean;
  sessionStartTime: string | null;
  sessionDuration: number; // in minutes
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  hasRole: () => false,
  isAdmin: () => false,
  isManager: () => false,
  isDev: () => false,
  isCommercial: () => false,
  canAccessClients: () => false,
  canAccessInvoices: () => false,
  canAccessUserManagement: () => false,
  canAccessProspects: () => false,
  sessionStartTime: null,
  sessionDuration: 0,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setUserProfile(data);
    }
  };

  // Global session tracking
  useEffect(() => {
    if (user && !sessionStartTime) {
      const now = new Date().toISOString();
      setSessionStartTime(now);
    }
  }, [user, sessionStartTime]);

  // Update session duration every minute
  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      const startTime = new Date(sessionStartTime);
      const now = new Date();
      const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
      setSessionDuration(durationMinutes);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [sessionStartTime]);





  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      
      if (data.session?.user) {
        await fetchUserProfile(data.session.user.id);
      }
      
      setLoading(false);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        

      } else {
        setUserProfile(null);
        setSessionStartTime(null); // Reset session timing on logout
        setSessionDuration(0);
      }
      setLoading(false); // Ensure loading is updated on auth state change
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: 'admin' | 'manager' | 'user' | 'commercial' | 'dev') => {
    return userProfile?.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager') || hasRole('admin');
  const isDev = () => hasRole('dev');
  const isCommercial = () => hasRole('commercial');

  // Permission helpers based on your requirements
  const canAccessClients = () => hasRole('admin') || hasRole('dev');
  const canAccessInvoices = () => hasRole('admin') || hasRole('manager') || hasRole('dev');
  const canAccessUserManagement = () => hasRole('admin') || hasRole('dev');
  const canAccessProspects = () => hasRole('admin') || hasRole('commercial') || hasRole('dev');

  return (
    <AuthContext.Provider value={{
      session,
      user,
      userProfile,
      loading,
      hasRole,
      isAdmin,
      isManager,
      isDev,
      isCommercial,
      canAccessClients,
      canAccessInvoices,
      canAccessUserManagement,
      canAccessProspects,
      sessionStartTime,
      sessionDuration,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 