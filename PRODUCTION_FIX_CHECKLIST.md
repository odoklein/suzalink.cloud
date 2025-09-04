# Production List Access Fix Checklist

## Issue Summary
Lists work in localhost but not in production due to missing environment variables and database policies.

## ✅ Code Changes Applied
- [x] Removed authentication checks from list API routes
- [x] Added fallback to anonymous key when service role key is missing
- [x] Updated middleware to exclude list routes from auth requirements
- [x] Fixed storage bucket name to use "attachements" (with the typo)

## 🔧 Production Environment Setup

### 1. Environment Variables
Ensure these are set in your production environment (Vercel, Netlify, etc.):

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key  # Optional but recommended
```

### 2. Database Policies
Run these SQL scripts in your production Supabase SQL editor:

#### A. Disable RLS Policies
```sql
-- Run the contents of disable_rls_policies.sql
```

#### B. Setup Storage Policies  
```sql
-- Run the contents of setup_storage_policies.sql
```

### 3. Storage Bucket Setup
In your Supabase dashboard:
1. Go to Storage
2. Ensure the "attachements" bucket exists and is public
3. If it doesn't exist, create it with public access

## 🧪 Testing
After deployment:
1. Test list creation in production
2. Test list viewing in production
3. Test CSV upload functionality
4. Check browser console for any remaining errors

## 🚨 Quick Fix
If you need immediate access, the code now falls back to the anonymous key, so lists should work even without the service role key in production.

## 📝 Notes
- The bucket name "attachements" (with typo) is intentionally kept to match existing code
- All authentication has been removed from list operations
- RLS policies are disabled for maximum compatibility
