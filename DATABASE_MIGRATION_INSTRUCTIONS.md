# 🗄️ Database Migration Instructions

## Steps to Apply System Columns Migration

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar

### 2. Run the Migration
1. Click **"New query"**
2. Copy the entire contents of `database_migration_system_columns.sql`
3. Paste it into the SQL editor
4. Click **"Run"** to execute the migration

### 3. Verify the Migration
After running the migration, you should see:
- ✅ 3 new columns added to `prospects` table:
  - `status` (text with default 'nouveau')
  - `commentaire` (text, nullable)
  - `rappel_date` (timestamp with time zone, nullable)
- ✅ 2 new indexes created for performance
- ✅ Existing prospects updated with default status
- ✅ Query results showing the new columns

### 4. Expected Result
The query should return something like:
```
column_name  | data_type                   | is_nullable | column_default
-------------|----------------------------|-------------|---------------
commentaire  | text                       | YES         | 
rappel_date  | timestamp with time zone   | YES         | 
status       | text                       | YES         | 'nouveau'::text
```

### 5. Test the Application
After successful migration:
1. Go to your prospects page
2. You should now see the 3 new system columns:
   - **Status** (dropdown with colored badges)
   - **Commentaire** (click to edit)
   - **Rappel** (date/time picker)

## 🚨 Important Notes
- This migration is **safe** and **non-destructive**
- It only **adds** new columns, doesn't modify existing data
- Uses `IF NOT EXISTS` clauses to prevent errors if run multiple times
- Includes proper constraints and indexes for performance

## 🔧 Troubleshooting
If you encounter any issues:
1. Check that you have the necessary permissions in Supabase
2. Ensure the `prospects` table exists
3. Verify that the `prospect_lists` and `prospect_columns` tables exist
4. Contact support if you see any constraint violations

## 📝 What This Migration Does
1. **Adds Status Column**: Tracks prospect status with 6 predefined values
2. **Adds Comment Column**: Stores notes and comments about prospects  
3. **Adds Reminder Column**: Stores date/time for follow-up reminders
4. **Creates Indexes**: Improves query performance for status and reminder filtering
5. **Sets Defaults**: Ensures existing prospects have 'nouveau' status
6. **Adds Constraints**: Prevents duplicate column names in prospect_columns table

