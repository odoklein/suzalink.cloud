import { auth } from "@/auth";
import { authConfig } from "@/auth.config";
import { redirect } from "next/navigation";

export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session.user;
}

export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  return session;
}

export async function requireRole(role: string) {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  if (session.user.role !== role) {
    redirect("/dashboard");
  }
  
  return session;
}

export async function requireAdmin() {
  return await requireRole("admin");
}

export async function requireManager() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    redirect("/dashboard");
  }
  
  return session;
}

export function validateSession(session: any) {
  if (!session?.user) {
    return false;
  }
  
  if (session.expires) {
    const expiryTime = new Date(session.expires);
    const now = new Date();
    return expiryTime > now;
  }
  
  return true;
}

export function getSessionExpiryTime(session: any): Date | null {
  if (!session?.expires) {
    return null;
  }
  
  return new Date(session.expires);
}

export function isSessionExpiringSoon(session: any, minutesThreshold: number = 5): boolean {
  const expiryTime = getSessionExpiryTime(session);
  
  if (!expiryTime) {
    return false;
  }
  
  const now = new Date();
  const timeUntilExpiry = expiryTime.getTime() - now.getTime();
  const thresholdMs = minutesThreshold * 60 * 1000;
  
  return timeUntilExpiry > 0 && timeUntilExpiry < thresholdMs;
}

export function formatSessionDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (hours < 24) {
    return `${hours}h ${minutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days}d ${remainingHours}h`;
} 