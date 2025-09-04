# Task Management Schema Documentation

## Overview

This document describes the comprehensive task management system integrated into the Suzailink CRM database. The system provides full task tracking, assignment, commenting, and file attachment capabilities.

## Database Tables

### 1. Tasks Table (`tasks`)

The main table for storing task information.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `title` (TEXT, NOT NULL): Task title
- `description` (TEXT): Detailed task description
- `status` (TEXT, NOT NULL): Current status
  - `todo`: Not started
  - `doing`: In progress
  - `done`: Completed
- `priority` (TEXT, NOT NULL): Task priority level
  - `low`: Low priority
  - `medium`: Medium priority
  - `high`: High priority
- `project_id` (UUID, NOT NULL): Reference to parent project
- `assignee_id` (UUID, NULLABLE): Assigned user
- `created_by` (UUID, NOT NULL): User who created the task
- `due_date` (DATE, NULLABLE): Task deadline
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Relationships:**
- Belongs to: `projects` (project_id)
- Belongs to: `users` (assignee_id, created_by)

### 2. Task Comments Table (`task_comments`)

Stores comments and discussions on tasks.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `task_id` (UUID, NOT NULL): Reference to task
- `user_id` (UUID, NOT NULL): Comment author
- `content` (TEXT, NOT NULL): Comment text
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Relationships:**
- Belongs to: `tasks` (task_id)
- Belongs to: `users` (user_id)

### 3. Task Attachments Table (`task_attachments`)

Stores file attachments for tasks.

**Fields:**
- `id` (UUID, Primary Key): Unique identifier
- `task_id` (UUID, NOT NULL): Reference to task
- `filename` (TEXT, NOT NULL): Original filename
- `file_url` (TEXT, NOT NULL): File storage URL/path
- `file_size` (INTEGER): File size in bytes
- `content_type` (TEXT): MIME type
- `uploaded_by` (UUID, NOT NULL): User who uploaded
- `created_at` (TIMESTAMP): Upload timestamp

**Relationships:**
- Belongs to: `tasks` (task_id)
- Belongs to: `users` (uploaded_by)

## Indexes

The following indexes are created for optimal performance:

**Tasks Indexes:**
- `idx_tasks_project_id`: Filter tasks by project
- `idx_tasks_assignee_id`: Filter tasks by assignee
- `idx_tasks_created_by`: Filter tasks by creator
- `idx_tasks_status`: Filter tasks by status
- `idx_tasks_priority`: Filter tasks by priority
- `idx_tasks_due_date`: Filter tasks by due date
- `idx_tasks_created_at`: Sort tasks by creation date

**Task Comments Indexes:**
- `idx_task_comments_task_id`: Get comments for a task
- `idx_task_comments_user_id`: Get comments by user
- `idx_task_comments_created_at`: Sort comments by date

**Task Attachments Indexes:**
- `idx_task_attachments_task_id`: Get attachments for a task
- `idx_task_attachments_uploaded_by`: Get attachments by user

## Constraints and Triggers

### Check Constraints
- `status` must be one of: 'todo', 'doing', 'done'
- `priority` must be one of: 'low', 'medium', 'high'

### Foreign Key Constraints
- Tasks cascade delete when project is deleted
- Task comments and attachments cascade delete when task is deleted
- Assignee references are set to NULL when user is deleted (preserves task history)

### Automatic Triggers
- `updated_at` fields are automatically updated on record changes
- Uses PostgreSQL's `update_updated_at_column()` function

## Usage Examples

### Creating a Task
```sql
INSERT INTO tasks (
  title,
  description,
  status,
  priority,
  project_id,
  assignee_id,
  created_by,
  due_date
) VALUES (
  'Implement user authentication',
  'Add login/logout functionality with JWT tokens',
  'todo',
  'high',
  'project-uuid-here',
  'user-uuid-here',
  'creator-uuid-here',
  '2024-02-15'
);
```

### Querying Tasks with Relationships
```sql
SELECT
  t.*,
  p.title as project_title,
  u_assignee.full_name as assignee_name,
  u_creator.full_name as creator_name
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
LEFT JOIN users u_creator ON t.created_by = u_creator.id
WHERE t.project_id = 'project-uuid-here'
ORDER BY t.created_at DESC;
```

### Getting Task Statistics
```sql
SELECT
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_count,
  COUNT(CASE WHEN status = 'doing' THEN 1 END) as doing_count,
  COUNT(CASE WHEN status = 'done' THEN 1 END) as done_count,
  COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'done' THEN 1 END) as overdue_count
FROM tasks
WHERE project_id = 'project-uuid-here';
```

## Migration

To apply this schema to your database:

1. Run the migration file: `20250102_add_tasks_management.sql`
2. Or execute the SQL statements manually in your PostgreSQL client

## Integration with Existing CRM

The task system integrates seamlessly with the existing CRM:

- **Projects**: Tasks belong to projects
- **Users**: Tasks can be assigned to users
- **Clients**: Projects (and thus tasks) are associated with clients
- **Authentication**: Uses existing user system for task assignment and creation

## API Endpoints (Suggested)

Based on the existing codebase structure, here are suggested API endpoints:

- `GET /api/projects/[projectId]/tasks` - List tasks for a project
- `POST /api/projects/[projectId]/tasks` - Create new task
- `GET /api/tasks/[taskId]` - Get task details
- `PUT /api/tasks/[taskId]` - Update task
- `DELETE /api/tasks/[taskId]` - Delete task
- `POST /api/tasks/[taskId]/comments` - Add comment
- `POST /api/tasks/[taskId]/attachments` - Upload attachment

## TypeScript Types

Comprehensive TypeScript types are provided in `app/types/task.ts` for type-safe development.

## Future Enhancements

Potential future improvements:
- Task dependencies (parent/child relationships)
- Time tracking
- Task templates
- Recurring tasks
- Task notifications
- Advanced filtering and search
- Task analytics and reporting
