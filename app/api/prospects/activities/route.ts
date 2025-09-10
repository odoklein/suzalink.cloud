import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// POST /api/prospects/activities - Add an activity to a prospect
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { prospectId, activityType, description, metadata } = body;
    
    if (!prospectId || !activityType) {
      return NextResponse.json({ error: 'Prospect ID and activity type are required' }, { status: 400 });
    }
    
    // Check if prospect exists
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id, data')
      .eq('id', prospectId)
      .single();
    
    if (prospectError) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }
    
    // Insert activity
    const { data, error } = await supabase
      .from('prospect_activities')
      .insert({
        prospect_id: prospectId,
        user_id: session.user.id,
        activity_type: activityType,
        description: description?.trim() || null,
        metadata: metadata || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting activity:', error);
      return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 });
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_activity_added',
      `Added ${activityType} activity for prospect "${prospect.data.name}"`
    );
    
    return NextResponse.json({ activity: data });
  } catch (error) {
    console.error('Error in POST /api/prospects/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/prospects/activities?prospectId=xxx - Get activities for a prospect
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const prospectId = url.searchParams.get('prospectId');
    
    if (!prospectId) {
      return NextResponse.json({ error: 'Prospect ID is required' }, { status: 400 });
    }
    
    const { data: activities, error } = await supabase
      .from('prospect_activities')
      .select(`
        *,
        users(id, name, email)
      `)
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }
    
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error in GET /api/prospects/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

