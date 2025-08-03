# Projects Foreign Key Constraint Fix

## Issue Description
The error `insert or update on table "tasks" violates foreign key constraint "tasks_project_id_fkey"` occurs because:
1. The `tasks` table is missing required fields (`priority`, `updated_at`)
2. Missing foreign key constraints
3. Missing indexes for performance
4. The project ID being referenced doesn't exist in the `projects` table

## Step-by-Step Fix

### 1. Run the Safe Database Migration
Execute the SQL script in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/safe-tasks-migration.sql
-- This will handle orphaned tasks and add missing fields, constraints, and indexes
```

**⚠️ IMPORTANT**: The original migration failed because there are tasks in your database that reference a project that doesn't exist. The safe migration script will:
1. Show you what orphaned tasks exist
2. Delete orphaned tasks (to preserve data integrity)
3. Add all the missing fields and constraints
4. Verify everything works correctly

### 2. Verify the Project Exists
Run the test script to check if the project exists:

```sql
-- Copy and paste the contents of scripts/test-project-exists.sql
-- This will help identify if the project ID is valid
```

### 3. If the Project Doesn't Exist
If the project `a0ab8501-27b8-400e-bb7c-856bf177c9ef` doesn't exist:

#### Option A: Create a Test Project
```sql
INSERT INTO projects (
    id, 
    title, 
    description, 
    status, 
    created_by
) VALUES (
    'a0ab8501-27b8-400e-bb7c-856bf177c9ef',
    'Test Project',
    'Test project for debugging',
    'active',
    'your-user-id-here'  -- Replace with actual user ID
);
```

#### Option B: Use an Existing Project
1. Find an existing project ID:
```sql
SELECT id, title FROM projects ORDER BY created_at DESC LIMIT 5;
```

2. Update your URL to use a valid project ID:
   - Change `/dashboard/projects/a0ab8501-27b8-400e-bb7c-856bf177c9ef` 
   - To `/dashboard/projects/VALID_PROJECT_ID`

### 4. Code Changes Applied
The following code changes have been made to prevent this issue:

#### Project Detail Page (`app/dashboard/projects/[id]/page.tsx`)
- ✅ Added project existence validation before task creation
- ✅ Added proper error handling for foreign key constraint violations
- ✅ Added `created_by` field to task creation
- ✅ Added `priority` field support
- ✅ Improved error messages for better debugging
- ✅ Added proper user authentication check

#### Database Schema
- ✅ Added `priority` field to tasks table
- ✅ Added `updated_at` field to tasks table
- ✅ Added foreign key constraints
- ✅ Added performance indexes
- ✅ Enabled RLS with proper policies
- ✅ Added automatic progress calculation triggers

## Verification Steps

### 1. Check Database Schema
```sql
-- Verify tasks table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;
```

### 2. Check Constraints
```sql
-- Verify foreign key constraints
SELECT 
    constraint_name, 
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'tasks';
```

### 3. Test Task Creation
1. Navigate to a valid project page
2. Try to create a new task
3. Verify the task is created successfully
4. Check that project progress updates automatically

## Common Issues and Solutions

### Issue: "Project not found" error
**Solution**: The project ID in the URL doesn't exist. Use a valid project ID.

### Issue: "Permission denied" error
**Solution**: Check RLS policies and ensure the user is authenticated.

### Issue: "Priority field not found" error
**Solution**: Run the migration script to add the missing `priority` field.

### Issue: "Foreign key constraint violation" error
**Solution**: Ensure the project exists before creating tasks.

## Prevention Measures

1. **Always validate project existence** before task operations
2. **Use proper error handling** for database operations
3. **Implement optimistic updates** for better UX
4. **Add proper loading states** during operations
5. **Use TypeScript interfaces** for better type safety

## Files Modified

- `app/dashboard/projects/[id]/page.tsx` - Fixed task creation and validation
- `supabase/migrations/fix_tasks_table.sql` - Database migration
- `scripts/safe-tasks-migration.sql` - Safe migration execution script (handles orphaned tasks)
- `scripts/fix-orphaned-tasks.sql` - Script to handle orphaned tasks manually
- `scripts/test-project-exists.sql` - Troubleshooting script

## Next Steps

1. **Run the safe migration script** (`scripts/safe-tasks-migration.sql`) in Supabase SQL Editor
2. **Review the output** to see what orphaned tasks were cleaned up
3. **Test task creation** with a valid project
4. **Verify all functionality** works correctly
5. **Consider implementing additional features** like task templates, bulk operations, etc.

## Alternative Solutions

If you want to preserve the orphaned tasks instead of deleting them, you can:

1. **Run the orphaned tasks script** (`scripts/fix-orphaned-tasks.sql`) first
2. **Choose one of the options** (delete, reassign to default project, or set to NULL)
3. **Then run the safe migration script** 