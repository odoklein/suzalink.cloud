import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/meeting-types - Get user's meeting types
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ meeting_types: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meeting-types - Create a new meeting type
export async function POST(req: NextRequest) {
  try {
    const {
      user_id,
      name,
      description,
      duration_minutes,
      price,
      color,
      is_active
    } = await req.json();

    if (!user_id || !name || !duration_minutes) {
      return NextResponse.json({ error: 'User ID, name, and duration are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('meeting_types')
      .insert([{
        user_id,
        name,
        description,
        duration_minutes,
        price,
        color: color || '#3B82F6',
        is_active: is_active !== undefined ? is_active : true
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ meeting_type: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 