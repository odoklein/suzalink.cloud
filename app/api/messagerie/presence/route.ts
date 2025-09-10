import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Get all users with their last activity
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, email, profile_picture_url, last_seen_at')
      .neq('id', session.user.id)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('Error fetching user presence:', error);
      return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 });
    }

    // Determine online status based on last_seen_at
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const usersWithPresence = users?.map(user => ({
      ...user,
      is_online: user.last_seen_at ? new Date(user.last_seen_at) > fiveMinutesAgo : false,
      last_seen: user.last_seen_at
    })) || [];

    return NextResponse.json({ users: usersWithPresence });
  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Update user's last seen timestamp
    const { error } = await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error updating presence:', error);
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
