"use client";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: 'admin' | 'manager' | 'user';
  fallback?: ReactNode;
}

export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  if (!hasRole(requiredRole)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience components for specific roles
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <RoleGuard requiredRole="admin" fallback={fallback}>{children}</RoleGuard>;
}

export function ManagerOrHigher({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <RoleGuard requiredRole="manager" fallback={fallback}>{children}</RoleGuard>;
}

export function UserOrHigher({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <RoleGuard requiredRole="user" fallback={fallback}>{children}</RoleGuard>;
} 