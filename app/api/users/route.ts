import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    // Get current session using NextAuth
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const fuzzy = searchParams.get('fuzzy');

    let users: any[] = [];
    let error = null;

    // First try to get users from public.users table
    // Try different column combinations since the schema might vary
    let query = supabase
      .from('users')
      .select('*');

    const { data: publicUsers, error: publicError } = await query;

    if (publicError) {
      console.error('Error fetching from public.users:', publicError);

      // If public.users fails, try auth.users (Supabase's built-in users table)
      if (publicError.code === 'PGRST116' || publicError.code === '42P01' || publicError.code === '42703') {
        console.log('Trying auth.users table instead...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
          console.error('Error fetching from auth.users:', authError);
          return NextResponse.json({ error: 'Failed to fetch users from any table' }, { status: 500 });
        }

        // Transform and filter auth users to match expected format
        users = authUsers.users.map(user => ({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email
        }));

        // Apply search filters to auth users
        if (search) {
          users = users.filter(user =>
            user.name?.toLowerCase().includes(search!.toLowerCase()) ||
            user.email?.toLowerCase().includes(search!.toLowerCase())
          );
        } else if (fuzzy) {
          users = users.filter(user =>
            user.name?.toLowerCase().includes(fuzzy!.toLowerCase()) ||
            user.email?.toLowerCase().includes(fuzzy!.toLowerCase())
          );
        }
      } else {
        error = publicError;
      }
    } else {
      // Transform public users to standardized format
      users = (publicUsers || []).map(user => ({
        id: user.id,
        name: user.name || user.full_name || user.first_name || user.email?.split('@')[0] || 'User',
        email: user.email
      }));

      // Apply search filters to public users
      if (search) {
        users = users.filter(user =>
          user.name?.toLowerCase().includes(search!.toLowerCase()) ||
          user.email?.toLowerCase().includes(search!.toLowerCase())
        );
      } else if (fuzzy) {
        users = users.filter(user =>
          user.name?.toLowerCase().includes(fuzzy!.toLowerCase()) ||
          user.email?.toLowerCase().includes(fuzzy!.toLowerCase())
        );
      }
    }

    if (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // Check if it's an RLS/policy error
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Access denied to users table. Check RLS policies.' }, { status: 403 });
      }

      return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
    }

    console.log('Users fetched:', users?.length || 0);
    console.log('Users data:', users);
    return NextResponse.json(users || []);

  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 