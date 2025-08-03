import { supabase } from './supabase';

export interface ActivityLogData {
  user_id: string;
  action: string;
  details: string;
  target_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log user activity to the database
 */
export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: data.user_id,
        action: data.action,
        details: data.details,
        target_user_id: data.target_user_id,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}

/**
 * Predefined activity types for consistency
 */
export const ActivityTypes = {
  // User management
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_PROFILE_VIEWED: 'user_profile_viewed',
  
  // Project activities
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  
  // Client activities
  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',
  CLIENT_DELETED: 'client_deleted',
  CLIENT_CONTACTED: 'client_contacted',
  
  // Email activities
  EMAIL_SENT: 'email_sent',
  EMAIL_READ: 'email_read',
  EMAIL_DELETED: 'email_deleted',
  
  // Booking activities
  BOOKING_CREATED: 'booking_created',
  BOOKING_UPDATED: 'booking_updated',
  BOOKING_CANCELLED: 'booking_cancelled',
  
  // Prospect activities
  PROSPECT_CREATED: 'prospect_created',
  PROSPECT_UPDATED: 'prospect_updated',
  PROSPECT_DELETED: 'prospect_deleted',
  PROSPECT_ASSIGNED: 'prospect_assigned',
  
  // System activities
  SETTINGS_UPDATED: 'settings_updated',
  DATA_EXPORTED: 'data_exported',
  DATA_IMPORTED: 'data_imported',
} as const;

/**
 * Helper functions for common activities
 */
export const ActivityHelpers = {
  // User activities
  logUserLogin: (userId: string, details?: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.USER_LOGIN,
      details: details || 'User logged in successfully',
    }),

  logUserLogout: (userId: string, details?: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.USER_LOGOUT,
      details: details || 'User logged out',
    }),

  logUserCreated: (adminId: string, newUserId: string, userName: string) => 
    logActivity({
      user_id: adminId,
      action: ActivityTypes.USER_CREATED,
      details: `Created new user: ${userName}`,
      target_user_id: newUserId,
    }),

  logUserUpdated: (adminId: string, targetUserId: string, userName: string) => 
    logActivity({
      user_id: adminId,
      action: ActivityTypes.USER_UPDATED,
      details: `Updated user profile: ${userName}`,
      target_user_id: targetUserId,
    }),

  logUserDeleted: (adminId: string, targetUserId: string, userName: string) => 
    logActivity({
      user_id: adminId,
      action: ActivityTypes.USER_DELETED,
      details: `Deleted user: ${userName}`,
      target_user_id: targetUserId,
    }),

  logProfileViewed: (viewerId: string, targetUserId: string, userName: string) => 
    logActivity({
      user_id: viewerId,
      action: ActivityTypes.USER_PROFILE_VIEWED,
      details: `Viewed profile of: ${userName}`,
      target_user_id: targetUserId,
    }),

  // Project activities
  logProjectCreated: (userId: string, projectName: string, projectId: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.PROJECT_CREATED,
      details: `Created project: ${projectName}`,
    }),

  logProjectUpdated: (userId: string, projectName: string, projectId: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.PROJECT_UPDATED,
      details: `Updated project: ${projectName}`,
    }),

  // Client activities
  logClientCreated: (userId: string, clientName: string, clientId: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.CLIENT_CREATED,
      details: `Created client: ${clientName}`,
    }),

  logClientContacted: (userId: string, clientName: string, method: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.CLIENT_CONTACTED,
      details: `Contacted client ${clientName} via ${method}`,
    }),

  // Email activities
  logEmailSent: (userId: string, recipient: string, subject: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.EMAIL_SENT,
      details: `Sent email to ${recipient}: ${subject}`,
    }),

  // Booking activities
  logBookingCreated: (userId: string, bookingType: string, date: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.BOOKING_CREATED,
      details: `Created booking: ${bookingType} on ${date}`,
    }),

  // Prospect activities
  logProspectCreated: (userId: string, prospectName: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.PROSPECT_CREATED,
      details: `Created prospect: ${prospectName}`,
    }),

  logProspectAssigned: (userId: string, prospectName: string, assignedTo: string) => 
    logActivity({
      user_id: userId,
      action: ActivityTypes.PROSPECT_ASSIGNED,
      details: `Assigned prospect ${prospectName} to ${assignedTo}`,
    }),

  // Generic activity logger
  logUserActivity: (userId: string, action: string, details: string) => 
    logActivity({
      user_id: userId,
      action,
      details,
    }),
}; 