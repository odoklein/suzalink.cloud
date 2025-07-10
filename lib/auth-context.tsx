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
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  loading: true,
  hasRole: () => false,
  isAdmin: () => false,
  isManager: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const hasRole = (role: 'admin' | 'manager' | 'user'): boolean => {
    if (!userProfile) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'user': 1
    };
    
    const userRoleLevel = roleHierarchy[userProfile.role];
    const requiredRoleLevel = roleHierarchy[role];
    
    return userRoleLevel >= requiredRoleLevel;
  };

  const isAdmin = (): boolean => hasRole('admin');
  const isManager = (): boolean => hasRole('manager');

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userProfile, 
      loading, 
      hasRole, 
      isAdmin, 
      isManager 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 