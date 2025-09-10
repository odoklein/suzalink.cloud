import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const excludeCurrentUser = searchParams.get('exclude_current') !== 'false';

    // Build query for users
    let userQuery = supabase
      .from('users')
      .select('id, full_name, email, role, created_at, profile_picture_url')
      .order('full_name');

    // Exclude current user if requested
    if (excludeCurrentUser) {
      userQuery = userQuery.neq('id', session.user.id);
    }

    // Apply search filter if query provided
    if (query.trim()) {
      userQuery = userQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    // Apply limit
    userQuery = userQuery.limit(limit);

    const { data: users, error } = await userQuery;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Error in users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
