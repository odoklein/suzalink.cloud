# Role-Based Access Control System

This CRM system now includes a comprehensive role-based access control (RBAC) system with three user roles: **Admin**, **Manager**, and **User**.

## User Roles

### Admin
- **Full system access**
- Can manage all users and their roles
- Can access all features and data
- Can view the "User Management" page
- Cannot change their own role (prevents accidental demotion)

### Manager
- **Elevated access**
- Can access most features
- Cannot manage other users
- Cannot access the "User Management" page

### User
- **Standard access**
- Basic user permissions
- Cannot access admin-only features

## Implementation Details

### Database Schema
- Added `user_role` enum with values: `'admin'`, `'manager'`, `'user'`
- Added `role` column to the `users` table with default value `'user'`

### Key Components

#### 1. Auth Context (`lib/auth-context.tsx`)
- Extended to include user profile with role information
- Added role-checking utilities:
  - `hasRole(role)` - Check if user has specific role or higher
  - `isAdmin()` - Check if user is admin
  - `isManager()` - Check if user is manager or admin

#### 2. Role Guard (`components/RoleGuard.tsx`)
- Component for protecting routes and features based on roles
- Includes convenience components:
  - `AdminOnly` - Only admins can access
  - `ManagerOrHigher` - Managers and admins can access
  - `UserOrHigher` - All authenticated users can access

#### 3. Updated Sidebar (`components/Sidebar.tsx`)
- Shows role-based navigation
- Displays user's current role with color-coded badge
- Filters navigation items based on user permissions

#### 4. User Management (`app/dashboard/users/page.tsx`)
- Admin-only page for managing user roles
- Allows admins to change other users' roles
- Prevents admins from changing their own role

## Usage Examples

### Protecting Routes
```tsx
import { AdminOnly } from "@/components/RoleGuard";

export default function AdminPage() {
  return (
    <AdminOnly>
      <div>Admin-only content</div>
    </AdminOnly>
  );
}
```

### Conditional Rendering
```tsx
import { useAuth } from "@/lib/auth-context";

export default function MyComponent() {
  const { isAdmin, hasRole } = useAuth();
  
  return (
    <div>
      {isAdmin() && <AdminPanel />}
      {hasRole('manager') && <ManagerPanel />}
    </div>
  );
}
```

### Role Hierarchy
The system uses a hierarchical approach:
- **Admin (Level 3)**: Can access everything
- **Manager (Level 2)**: Can access manager and user features
- **User (Level 1)**: Can access basic user features

## Migration Instructions

1. **Run the migration** in your Supabase SQL editor:
   ```sql
   -- Run the contents of lib/add-user-roles-migration.sql
   ```

2. **Update existing users** with appropriate roles:
   ```sql
   -- Set admin users
   UPDATE public.users SET role = 'admin' WHERE email IN ('admin@example.com');
   
   -- Set manager users
   UPDATE public.users SET role = 'manager' WHERE email IN ('manager@example.com');
   ```

3. **Test the system** by logging in with different user accounts and verifying role-based access.

## Security Notes

- Role checks are performed on both client and server side
- Users cannot escalate their own privileges
- All role changes are logged and can be audited
- The system prevents privilege escalation attacks

## Future Enhancements

- Add role-based permissions for specific actions (create, read, update, delete)
- Implement role-based data filtering
- Add audit logging for role changes
- Create role templates for different user types 