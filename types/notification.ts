export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export enum NotificationType {
  // Task notifications
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_STATUS_CHANGED = 'task_status_changed',
  FORGOTTEN_TASK = 'forgotten_task',

  // Project notifications
  PROJECT_ASSIGNED = 'project_assigned',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_PASSED = 'deadline_passed',

  // Prospect notifications
  PROSPECT_ASSIGNED = 'prospect_assigned',
  PROSPECT_STATUS_CHANGED = 'prospect_status_changed',
  PROSPECT_RAPPEL_DUE = 'prospect_rappel_due',
  PROSPECT_RAPPEL_OVERDUE = 'prospect_rappel_overdue',
  PROSPECT_LIST_ASSIGNED = 'prospect_list_assigned',
  PROSPECT_LIST_USER_ASSIGNED = 'prospect_list_user_assigned',

  // Email notifications
  EMAIL_RECEIVED = 'email_received',
  EMAIL_SENT = 'email_sent',

  // Message notifications
  MESSAGE_RECEIVED = 'message_received',

  // Invoice notifications
  INVOICE_CREATED = 'invoice_created',
  INVOICE_OVERDUE = 'invoice_overdue',

  // System notifications
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  USER_MENTIONED = 'user_mentioned',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationFilters {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  isRead?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationSort {
  field: 'createdAt' | 'priority' | 'type';
  direction: 'asc' | 'desc';
}
