# Dynamic Status Management for Prospects

This feature allows you to create, edit, and manage prospect status options dynamically through a user-friendly interface.

## 🚀 Features

- **Dynamic Status Options**: Create custom status options with names, colors, and descriptions
- **Visual Management**: Intuitive interface with color picker and status preview
- **Active/Inactive States**: Enable or disable status options without deleting them
- **Sort Order**: Control the display order of status options
- **Real-time Updates**: Changes are immediately reflected in the prospect list
- **Permission-based Access**: Only admin and dev users can manage status options
- **Data Integrity**: Prevents deletion of status options that are in use

## 📁 Files Added/Modified

### Database Migrations
- `supabase/migrations/003_create_prospect_status_options.sql` - Creates the status options table
- `supabase/migrations/004_update_prospect_status_constraint.sql` - Updates prospect status constraint

### API Endpoints
- `app/api/prospects/status-options/route.ts` - CRUD operations for status options
- `app/api/prospects/status-options/[id]/route.ts` - Individual status option operations

### Components
- `app/dashboard/prospects/components/StatusManagementModal.tsx` - Status management interface
- `app/dashboard/prospects/components/ProspectsGrid.tsx` - Updated to use dynamic status options

### Scripts
- `scripts/run-status-migrations.js` - Migration runner script

## 🗄️ Database Schema

### prospect_status_options Table
```sql
CREATE TABLE public.prospect_status_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prospect_status_options_pkey PRIMARY KEY (id),
  CONSTRAINT prospect_status_options_name_unique UNIQUE (name),
  CONSTRAINT prospect_status_options_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

### Updated prospects Table Constraint
The prospects table now uses a dynamic constraint that validates status values against active status options:

```sql
CREATE OR REPLACE FUNCTION check_prospect_status(status_value text)
RETURNS boolean AS $$
BEGIN
  IF status_value IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.prospect_status_options 
    WHERE name = status_value AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;
```

## 🛠️ Setup Instructions

### 1. Run Database Migrations

Since you already have the `prospect_status_options` table, you only need to run the constraint update:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/004_update_prospect_status_constraint.sql
```

### 2. Insert Default Status Options (Optional)

If you want to populate the table with default status options:

```sql
INSERT INTO public.prospect_status_options (name, color, description, sort_order, created_by) VALUES
  ('NRP', '#6B7280', 'Nouveau Prospect', 1, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Rappel', '#8B5CF6', 'À rappeler', 2, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Relance', '#F59E0B', 'À relancer', 3, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('Mail', '#3B82F6', 'Email envoyé', 4, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('pas interessé', '#EF4444', 'Pas intéressé', 5, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('barrage', '#DC2626', 'Barrage', 6, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('devis', '#10B981', 'Devis demandé', 7, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)),
  ('rdv', '#059669', 'Rendez-vous pris', 8, (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1))
ON CONFLICT (name) DO NOTHING;
```

## 🎯 Usage

### Accessing Status Management

1. Navigate to the Prospects page
2. Click the "Gérer les statuts" (Manage Status) button in the toolbar
3. The Status Management Modal will open

### Creating a New Status

1. Click "Nouveau statut" (New Status)
2. Fill in the form:
   - **Name**: Required, unique status name
   - **Color**: Choose from predefined colors or enter a hex code
   - **Description**: Optional description
   - **Active**: Toggle to enable/disable the status
   - **Sort Order**: Number to control display order
3. Click "Créer" (Create)

### Editing a Status

1. Click the edit icon (pencil) next to any status
2. Modify the fields as needed
3. Click "Mettre à jour" (Update)

### Deleting a Status

1. Click the delete icon (trash) next to any status
2. Confirm the deletion
3. Note: Status options that are in use by prospects cannot be deleted

### Activating/Deactivating a Status

1. Click the switch next to any status to toggle its active state
2. Inactive statuses won't appear in the dropdown for new prospects

## 🎨 Color System

The system supports predefined colors that map to Tailwind CSS classes:

| Hex Color | Tailwind Class | Usage |
|-----------|----------------|-------|
| #6B7280 | bg-gray-100 text-gray-800 | Default/NRP |
| #8B5CF6 | bg-purple-100 text-purple-800 | Rappel |
| #F59E0B | bg-orange-100 text-orange-800 | Relance |
| #3B82F6 | bg-blue-100 text-blue-800 | Mail |
| #EF4444 | bg-red-100 text-red-800 | Pas intéressé |
| #DC2626 | bg-red-200 text-red-900 | Barrage |
| #10B981 | bg-green-100 text-green-800 | Devis |
| #059669 | bg-emerald-100 text-emerald-800 | RDV |

## 🔒 Permissions

- **Admin & Dev Users**: Full access to create, edit, and delete status options
- **Commercial Users**: Can only view and use existing status options
- **Other Users**: Can only view and use existing status options

## 🔄 API Endpoints

### GET /api/prospects/status-options
Retrieve all status options (active only by default)

**Query Parameters:**
- `includeInactive=true` - Include inactive status options

### POST /api/prospects/status-options
Create a new status option

**Body:**
```json
{
  "name": "string",
  "color": "#hexcolor",
  "description": "string",
  "is_active": boolean,
  "sort_order": number
}
```

### PUT /api/prospects/status-options/[id]
Update an existing status option

### DELETE /api/prospects/status-options/[id]
Delete a status option (only if not in use)

## 🐛 Troubleshooting

### Status Options Not Loading
- Check if the `prospect_status_options` table exists
- Verify the API endpoints are accessible
- Check browser console for errors

### Cannot Delete Status Option
- Ensure no prospects are using the status
- Check the error message for specific details

### Status Colors Not Displaying
- Verify the color hex codes are valid
- Check if the color mapping exists in the component

## 🚀 Future Enhancements

- **Bulk Status Updates**: Update multiple prospects at once
- **Status History**: Track status changes over time
- **Custom Color Picker**: More advanced color selection
- **Status Templates**: Predefined status sets for different industries
- **Status Analytics**: Reports on status distribution and trends

## 📝 Notes

- Status options are shared across all prospect lists
- The system maintains backward compatibility with existing status values
- All status operations are logged for audit purposes
- The interface is fully responsive and works on mobile devices
