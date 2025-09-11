import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'email', 'call', 'meeting', 'note', etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createServerSupabaseClient();

    // Build query for prospect activities
    let query = supabase
      .from('prospect_activities')
      .select('*')
      .eq('prospect_id', params.id)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by activity type if specified
    if (type) {
      query = query.eq('activity_type', type);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('prospect_activities')
      .select('*', { count: 'exact', head: true })
      .eq('prospect_id', params.id)
      .eq('user_id', session.user.id)
      .eq(type ? 'activity_type' : 'prospect_id', type || params.id);

    return NextResponse.json({
      activities: activities || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Activities API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      activityType,
      description,
      metadata = {}
    } = body;

    if (!activityType || !description) {
      return NextResponse.json({
        error: 'Activity type and description are required'
      }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: activity, error } = await supabase
      .from('prospect_activities')
      .insert({
        prospect_id: params.id,
        user_id: session.user.id,
        activity_type: activityType,
        description,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }

    return NextResponse.json({
      activity,
      message: 'Activity created successfully'
    });

  } catch (error) {
    console.error('Create activity API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
