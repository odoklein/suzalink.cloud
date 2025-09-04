// Task management types and interfaces

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  assignee_id?: string | null;
  created_by: string;
  due_date?: string | null;
  created_at: string;
  updated_at: string;

  // Populated relationships (optional, depending on query)
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  project?: {
    id: string;
    title: string;
    description?: string;
    status: string;
  };
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;

  // Populated relationship
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  filename: string;
  file_url: string;
  file_size?: number;
  content_type?: string;
  uploaded_by: string;
  created_at: string;

  // Populated relationship
  uploader?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Form types for creating/updating tasks
export interface CreateTaskForm {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  assignee_id?: string | null;
  due_date?: string;
}

export interface UpdateTaskForm extends Partial<CreateTaskForm> {
  id: string;
}

// Task statistics and analytics
export interface TaskStats {
  total: number;
  todo: number;
  doing: number;
  done: number;
  overdue: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
  byAssignee: Array<{
    assignee_id: string;
    assignee_name: string;
    task_count: number;
  }>;
}

// Task filters for querying
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  project_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue_only?: boolean;
}

// Kanban board column configuration
export interface TaskColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

// Task activity log entry
export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'assigned' | 'status_changed';
  details?: string;
  old_value?: any;
  new_value?: any;
  created_at: string;

  user?: {
    id: string;
    full_name: string;
  };
}
