import { supabase } from '@/lib/supabase';
import {
  notifyTaskDueSoon,
  notifyTaskOverdue,
  notifyForgottenTask,
  notifyDeadlineApproaching,
  notifyDeadlinePassed,
} from '@/lib/notification-utils';

// Check for tasks that are due soon (within 24 hours)
export async function checkTaskDeadlines() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: tasks, error } = await supabase
    .from('tasks') // Assuming you have a tasks table
    .select('id, title, due_date, assigned_to, status')
    .eq('status', 'pending')
    .lte('due_date', tomorrow.toISOString())
    .gt('due_date', new Date().toISOString());

  if (error) {
    console.error('Error fetching tasks for deadline check:', error);
    return;
  }

  for (const task of tasks) {
    try {
      await notifyTaskDueSoon(
        task.id,
        task.title,
        task.assigned_to,
        new Date(task.due_date)
      );
    } catch (error) {
      console.error(`Error notifying task deadline for task ${task.id}:`, error);
    }
  }
}

// Check for overdue tasks
export async function checkOverdueTasks() {
  const now = new Date();

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, assigned_to, status')
    .eq('status', 'pending')
    .lt('due_date', now.toISOString());

  if (error) {
    console.error('Error fetching overdue tasks:', error);
    return;
  }

  for (const task of tasks) {
    try {
      await notifyTaskOverdue(task.id, task.title, task.assigned_to);
    } catch (error) {
      console.error(`Error notifying overdue task ${task.id}:`, error);
    }
  }
}

// Check for forgotten tasks (not updated in 7+ days)
export async function checkForgottenTasks() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, updated_at, assigned_to, status')
    .eq('status', 'pending')
    .lt('updated_at', sevenDaysAgo.toISOString());

  if (error) {
    console.error('Error fetching forgotten tasks:', error);
    return;
  }

  for (const task of tasks) {
    try {
      const daysInactive = Math.floor(
        (new Date().getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      await notifyForgottenTask(task.id, task.title, task.assigned_to, daysInactive);
    } catch (error) {
      console.error(`Error notifying forgotten task ${task.id}:`, error);
    }
  }
}


// Check for general deadlines (projects, etc.)
export async function checkGeneralDeadlines() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check project deadlines
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name, deadline, assigned_to')
    .lte('deadline', tomorrow.toISOString())
    .gt('deadline', new Date().toISOString())
    .not('deadline', 'is', null);

  if (projectError) {
    console.error('Error fetching project deadlines:', projectError);
  } else {
    for (const project of projects) {
      try {
        await notifyDeadlineApproaching(
          project.id,
          project.name,
          'Projet',
          project.assigned_to,
          new Date(project.deadline)
        );
      } catch (error) {
        console.error(`Error notifying project deadline ${project.id}:`, error);
      }
    }
  }

  // Check overdue projects
  const { data: overdueProjects, error: overdueError } = await supabase
    .from('projects')
    .select('id, name, deadline, assigned_to')
    .lt('deadline', new Date().toISOString())
    .not('deadline', 'is', null);

  if (overdueError) {
    console.error('Error fetching overdue projects:', overdueError);
  } else {
    for (const project of overdueProjects) {
      try {
        await notifyDeadlinePassed(
          project.id,
          project.name,
          'Projet',
          project.assigned_to
        );
      } catch (error) {
        console.error(`Error notifying overdue project ${project.id}:`, error);
      }
    }
  }
}

// Main function to run all notification checks
export async function runNotificationChecks() {
  try {
    console.log('Running notification checks...');

    await Promise.all([
      checkTaskDeadlines(),
      checkOverdueTasks(),
      checkForgottenTasks(),
      checkGeneralDeadlines(),
    ]);

    console.log('Notification checks completed');
  } catch (error) {
    console.error('Error running notification checks:', error);
  }
}
