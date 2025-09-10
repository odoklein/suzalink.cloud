import { supabase } from '@/lib/supabase';
import { NotificationType, NotificationPriority } from '@/types/notification';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: any;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notificationData = {
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    priority: params.priority || NotificationPriority.MEDIUM,
    data: params.data || null,
    is_read: false,
    expires_at: params.expiresAt?.toISOString() || null,
    action_url: params.actionUrl || null,
    action_label: params.actionLabel || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  // Send email notification for high/urgent priority notifications
  if (params.priority === NotificationPriority.HIGH || params.priority === NotificationPriority.URGENT) {
    try {
      // Send email asynchronously via API endpoint (don't wait for it to complete)
      fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: data.id,
          userEmail: '', // Will be fetched server-side
          notification: {
            ...data,
            userId: data.user_id,
            isRead: data.is_read,
            createdAt: new Date(data.created_at),
            expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
            actionUrl: data.action_url,
            actionLabel: data.action_label,
          }
        }),
      }).catch((emailError) => {
        console.error('Failed to send email notification:', emailError);
        // Don't throw - email failure shouldn't break notification creation
      });
    } catch (emailError) {
      console.error('Error preparing email notification:', emailError);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  return data;
}

// Task-related notification triggers
export async function notifyTaskAssigned(taskId: string, taskTitle: string, assigneeId: string, assignerName: string, projectId?: string) {
  await createNotification({
    userId: assigneeId,
    type: NotificationType.TASK_ASSIGNED,
    title: 'Nouvelle tâche assignée',
    message: `${assignerName} vous a assigné la tâche "${taskTitle}"`,
    priority: NotificationPriority.HIGH,
    data: { taskId, projectId },
    actionUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/projects`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyTaskDueSoon(taskId: string, taskTitle: string, userId: string, dueDate: Date, projectId?: string) {
  await createNotification({
    userId,
    type: NotificationType.TASK_DUE_SOON,
    title: 'Tâche à échéance proche',
    message: `La tâche "${taskTitle}" arrive à échéance le ${dueDate.toLocaleDateString('fr-FR')}`,
    priority: NotificationPriority.HIGH,
    data: { taskId, projectId },
    actionUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/projects`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyTaskOverdue(taskId: string, taskTitle: string, userId: string, projectId?: string) {
  await createNotification({
    userId,
    type: NotificationType.TASK_OVERDUE,
    title: 'Tâche en retard',
    message: `La tâche "${taskTitle}" est en retard`,
    priority: NotificationPriority.URGENT,
    data: { taskId, projectId },
    actionUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/projects`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyTaskStatusChanged(taskId: string, taskTitle: string, userId: string, oldStatus: string, newStatus: string, changedBy: string, projectId?: string) {
  const statusLabels: Record<string, string> = {
    'todo': 'À faire',
    'doing': 'En cours',
    'done': 'Terminé'
  };

  await createNotification({
    userId,
    type: NotificationType.TASK_STATUS_CHANGED,
    title: 'Statut de tâche modifié',
    message: `${changedBy} a changé le statut de "${taskTitle}" de "${statusLabels[oldStatus] || oldStatus}" à "${statusLabels[newStatus] || newStatus}"`,
    priority: NotificationPriority.MEDIUM,
    data: { taskId, oldStatus, newStatus, projectId },
    actionUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/projects`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyForgottenTask(taskId: string, taskTitle: string, userId: string, daysInactive: number, projectId?: string) {
  await createNotification({
    userId,
    type: NotificationType.FORGOTTEN_TASK,
    title: 'Tâche oubliée',
    message: `La tâche "${taskTitle}" n'a pas été mise à jour depuis ${daysInactive} jours`,
    priority: NotificationPriority.MEDIUM,
    data: { taskId, projectId },
    actionUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/projects`,
    actionLabel: 'Voir la tâche',
  });
}

// Project-related notification triggers
export async function notifyProjectAssigned(projectId: string, projectName: string, assigneeId: string, assignerName: string) {
  await createNotification({
    userId: assigneeId,
    type: NotificationType.PROJECT_ASSIGNED,
    title: 'Nouveau projet assigné',
    message: `${assignerName} vous a assigné au projet "${projectName}"`,
    priority: NotificationPriority.HIGH,
    data: { projectId },
    actionUrl: `/dashboard/projects/${projectId}`,
    actionLabel: 'Voir le projet',
  });
}

// Prospect-related notification triggers

// Deadline notification triggers
export async function notifyDeadlineApproaching(itemId: string, itemTitle: string, itemType: string, userId: string, deadline: Date) {
  await createNotification({
    userId,
    type: NotificationType.DEADLINE_APPROACHING,
    title: 'Échéance proche',
    message: `${itemType} "${itemTitle}" arrive à échéance le ${deadline.toLocaleDateString('fr-FR')}`,
    priority: NotificationPriority.HIGH,
    data: { itemId, itemType },
    actionUrl: getItemUrl(itemType, itemId),
    actionLabel: 'Voir les détails',
  });
}

export async function notifyDeadlinePassed(itemId: string, itemTitle: string, itemType: string, userId: string) {
  await createNotification({
    userId,
    type: NotificationType.DEADLINE_PASSED,
    title: 'Échéance dépassée',
    message: `${itemType} "${itemTitle}" a dépassé son échéance`,
    priority: NotificationPriority.URGENT,
    data: { itemId, itemType },
    actionUrl: getItemUrl(itemType, itemId),
    actionLabel: 'Voir les détails',
  });
}

function getItemUrl(itemType: string, itemId: string): string {
  switch (itemType.toLowerCase()) {
    case 'task':
      return `/dashboard/tasks/${itemId}`;
    case 'project':
      return `/dashboard/projects/${itemId}`;
    default:
      return `/dashboard`;
  }
}
