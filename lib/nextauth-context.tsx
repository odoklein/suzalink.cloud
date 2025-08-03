"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface AuthContextType {
  session: Session | null;
  user: Session['user'] | null;
  userProfile: Session['user'] | null;
  loading: boolean;
  hasRole: (role: 'admin' | 'manager' | 'user') => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  sessionStartTime: string | null;
  sessionDuration: number; // in minutes
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<Session['user']>) => Promise<void>;
  refreshSession: () => Promise<void>;
  isSessionValid: boolean;
  sessionExpiryTime: Date | null;
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
  logout: async () => {},
  updateUserProfile: async () => {},
  refreshSession: async () => {},
  isSessionValid: false,
  sessionExpiryTime: null,
});

export function NextAuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [sessionExpiryTime, setSessionExpiryTime] = useState<Date | null>(null);

  const loading = status === "loading";

  // Session validation and expiry tracking
  useEffect(() => {
    if (session?.expires) {
      const expiryTime = new Date(session.expires);
      const now = new Date();
      const isValid = expiryTime > now;
      
      setIsSessionValid(isValid);
      setSessionExpiryTime(expiryTime);
      
      // Auto-refresh session if it's about to expire (within 5 minutes)
      const timeUntilExpiry = expiryTime.getTime() - now.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeUntilExpiry > 0 && timeUntilExpiry < fiveMinutes) {
        const refreshTimer = setTimeout(() => {
          updateSession();
        }, timeUntilExpiry - (60 * 1000)); // Refresh 1 minute before expiry
        
        return () => clearTimeout(refreshTimer);
      }
    }
  }, [session?.expires, updateSession]);

  // Global session tracking
  useEffect(() => {
    if (session?.user && !sessionStartTime) {
      const now = new Date().toISOString();
      setSessionStartTime(now);
      
      // Store session start in localStorage for persistence
      localStorage.setItem('sessionStartTime', now);
    } else if (!session?.user) {
      setSessionStartTime(null);
      setSessionDuration(0);
      localStorage.removeItem('sessionStartTime');
    }
  }, [session?.user, sessionStartTime]);

  // Restore session start time from localStorage
  useEffect(() => {
    const storedStartTime = localStorage.getItem('sessionStartTime');
    if (storedStartTime && session?.user && !sessionStartTime) {
      setSessionStartTime(storedStartTime);
    }
  }, [session?.user, sessionStartTime]);

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

  const hasRole = (role: 'admin' | 'manager' | 'user') => {
    return session?.user?.role === role;
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager') || hasRole('admin');

  const logout = async () => {
    // Clear local storage
    localStorage.removeItem('sessionStartTime');
    
    // Sign out
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  const updateUserProfile = async (data: Partial<Session['user']>) => {
    try {
      await updateSession(data);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      await updateSession();
    } catch (error) {
      console.error('Failed to refresh session:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user || null,
      userProfile: session?.user || null,
      loading,
      hasRole,
      isAdmin,
      isManager,
      sessionStartTime,
      sessionDuration,
      logout,
      updateUserProfile,
      refreshSession,
      isSessionValid,
      sessionExpiryTime,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useNextAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useNextAuth must be used within a NextAuthProvider');
  }
  return context;
}; 