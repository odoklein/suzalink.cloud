import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      role: session.user.role || 'user',
      full_name: session.user.name,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: string): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if the current user can manage users (admin or manager)
 */
export async function canManageUsers(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || user?.role === 'manager';
}

/**
 * Verify admin permissions and return user data
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized - User not authenticated');
  }
  if (user.role !== 'admin') {
    throw new Error('Insufficient permissions - Admin role required');
  }
  return user;
}

/**
 * Log user activity
 */
export async function logUserActivity(
  userId: string,
  action: string,
  details: string,
  targetUserId?: string
): Promise<void> {
  try {
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        action,
        details,
        target_user_id: targetUserId,
      });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Validate user permissions for specific operations
 */
export async function validateUserPermissions(
  operation: 'read' | 'create' | 'update' | 'delete',
  targetUserId?: string
): Promise<{ allowed: boolean; user: AuthUser | null; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { allowed: false, user: null, error: 'User not authenticated' };
    }

    // Admin can do everything
    if (user.role === 'admin') {
      return { allowed: true, user };
    }

    // Manager can read and update users
    if (user.role === 'manager') {
      if (operation === 'read' || operation === 'update') {
        return { allowed: true, user };
      }
      return { allowed: false, user, error: 'Manager cannot create or delete users' };
    }

    // Regular users can only read and update their own data
    if (user.role === 'user') {
      if (operation === 'read' || operation === 'update') {
        if (targetUserId && targetUserId !== user.id) {
          return { allowed: false, user, error: 'Users can only access their own data' };
        }
        return { allowed: true, user };
      }
      return { allowed: false, user, error: 'Users cannot create or delete other users' };
    }

    return { allowed: false, user, error: 'Unknown role' };
  } catch (error) {
    console.error('Error validating user permissions:', error);
    return { allowed: false, user: null, error: 'Error validating permissions' };
  }
} 