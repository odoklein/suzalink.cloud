import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const fuzzy = searchParams.get('fuzzy');

    let query = supabase
      .from('users')
      .select('id, name, email');

    if (search) {
      // Exact search by name or email
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    } else if (fuzzy) {
      // Fuzzy search for partial matches
      query = query.or(`name.ilike.%${fuzzy}%,email.ilike.%${fuzzy}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(users || []);

  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 