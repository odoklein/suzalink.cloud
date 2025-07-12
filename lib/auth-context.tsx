"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasRole: (role: 'admin' | 'manager' | 'user') => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
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
      
      // Log session start
      const logSessionStart = async () => {
        try {
          await supabase.from("user_activity").insert([
            {
              user_id: user.id,
              action: 'session_start',
              details: { startTime: now, page: window.location.pathname }
            }
          ]);
        } catch (error) {
          console.error('Session start log error:', error);
        }
      };
      logSessionStart();
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

  // Log page visits
  useEffect(() => {
    if (user) {
      const logPageVisit = async () => {
        try {
          await supabase.from("user_activity").insert([
            {
              user_id: user.id,
              action: 'page_visit',
              details: { 
                page: window.location.pathname, 
                timestamp: new Date().toISOString(),
                sessionDuration: sessionDuration
              }
            }
          ]);
        } catch (error) {
          console.error('Page visit log error:', error);
        }
      };

      // Log initial page visit
      logPageVisit();

      // Log page visits when user navigates
      const handleRouteChange = () => {
        logPageVisit();
      };

      // Listen for route changes (Next.js)
      window.addEventListener('popstate', handleRouteChange);
      
      return () => {
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [user, sessionDuration]);

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
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const hasRole = (role: 'admin' | 'manager' | 'user') => {
    return userProfile?.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager') || hasRole('admin');

  return (
    <AuthContext.Provider value={{
      session,
      user,
      userProfile,
      loading,
      hasRole,
      isAdmin,
      isManager,
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