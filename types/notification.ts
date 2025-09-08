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
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  PROJECT_ASSIGNED = 'project_assigned',
  PROSPECT_LIST_ASSIGNED = 'prospect_list_assigned',
  PROSPECT_RAPPEL_DUE = 'prospect_rappel_due',
  PROSPECT_RAPPEL_OVERDUE = 'prospect_rappel_overdue',
  FORGOTTEN_TASK = 'forgotten_task',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_PASSED = 'deadline_passed',
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
