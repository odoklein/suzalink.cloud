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
  const { data, error } = await supabase
    .from('notifications')
    .insert({
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
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

// Task-related notification triggers
export async function notifyTaskAssigned(taskId: string, taskTitle: string, assigneeId: string, assignerName: string) {
  await createNotification({
    userId: assigneeId,
    type: NotificationType.TASK_ASSIGNED,
    title: 'Nouvelle tâche assignée',
    message: `${assignerName} vous a assigné la tâche "${taskTitle}"`,
    priority: NotificationPriority.HIGH,
    data: { taskId },
    actionUrl: `/dashboard/tasks/${taskId}`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyTaskDueSoon(taskId: string, taskTitle: string, userId: string, dueDate: Date) {
  await createNotification({
    userId,
    type: NotificationType.TASK_DUE_SOON,
    title: 'Tâche à échéance proche',
    message: `La tâche "${taskTitle}" arrive à échéance le ${dueDate.toLocaleDateString('fr-FR')}`,
    priority: NotificationPriority.HIGH,
    data: { taskId },
    actionUrl: `/dashboard/tasks/${taskId}`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyTaskOverdue(taskId: string, taskTitle: string, userId: string) {
  await createNotification({
    userId,
    type: NotificationType.TASK_OVERDUE,
    title: 'Tâche en retard',
    message: `La tâche "${taskTitle}" est en retard`,
    priority: NotificationPriority.URGENT,
    data: { taskId },
    actionUrl: `/dashboard/tasks/${taskId}`,
    actionLabel: 'Voir la tâche',
  });
}

export async function notifyForgottenTask(taskId: string, taskTitle: string, userId: string, daysInactive: number) {
  await createNotification({
    userId,
    type: NotificationType.FORGOTTEN_TASK,
    title: 'Tâche oubliée',
    message: `La tâche "${taskTitle}" n'a pas été mise à jour depuis ${daysInactive} jours`,
    priority: NotificationPriority.MEDIUM,
    data: { taskId },
    actionUrl: `/dashboard/tasks/${taskId}`,
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
export async function notifyProspectListAssigned(listId: string, listName: string, assigneeId: string, assignerName: string) {
  await createNotification({
    userId: assigneeId,
    type: NotificationType.PROSPECT_LIST_ASSIGNED,
    title: 'Nouvelle liste de prospects assignée',
    message: `${assignerName} vous a assigné la liste "${listName}"`,
    priority: NotificationPriority.MEDIUM,
    data: { listId },
    actionUrl: `/dashboard/prospects/lists/${listId}`,
    actionLabel: 'Voir la liste',
  });
}

export async function notifyProspectRappelDue(prospectId: string, prospectName: string, userId: string, rappelDate: Date) {
  await createNotification({
    userId,
    type: NotificationType.PROSPECT_RAPPEL_DUE,
    title: 'Rappel prospect à échéance',
    message: `Rappel programmé pour ${prospectName} le ${rappelDate.toLocaleDateString('fr-FR')}`,
    priority: NotificationPriority.HIGH,
    data: { prospectId },
    actionUrl: `/dashboard/prospects/${prospectId}`,
    actionLabel: 'Voir le prospect',
  });
}

export async function notifyProspectRappelOverdue(prospectId: string, prospectName: string, userId: string) {
  await createNotification({
    userId,
    type: NotificationType.PROSPECT_RAPPEL_OVERDUE,
    title: 'Rappel prospect en retard',
    message: `Le rappel pour ${prospectName} est en retard`,
    priority: NotificationPriority.URGENT,
    data: { prospectId },
    actionUrl: `/dashboard/prospects/${prospectId}`,
    actionLabel: 'Voir le prospect',
  });
}

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
    case 'prospect':
      return `/dashboard/prospects/${itemId}`;
    default:
      return `/dashboard`;
  }
}
