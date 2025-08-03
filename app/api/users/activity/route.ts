import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@/auth';

// GET - Fetch user activity with filters or statistics
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stats = searchParams.get('stats');
    
    // If stats parameter is present, return statistics
    if (stats === 'true') {
      return await getActivityStats(req);
    }
    
    // Otherwise, return regular activity list
    return await getActivityList(req);
  } catch (error) {
    console.error('Error in GET /api/users/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getActivityList(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('user_activity')
    .select(`
      *,
      user:users!user_activity_user_id_fkey(full_name, email),
      target_user:users!user_activity_target_user_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter by specific user
  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Filter by action type
  if (action) {
    query = query.eq('action', action);
  }

  // Filter by date range
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: activities, error } = await query;

  if (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }

  return NextResponse.json({ activities });
}

async function getActivityStats(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  let query = supabase
    .from('user_activity')
    .select('action, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: activities, error } = await query;

  if (error) {
    console.error('Error fetching activity stats:', error);
    return NextResponse.json({ error: 'Failed to fetch activity stats' }, { status: 500 });
  }

  // Calculate statistics
  const actionCounts = activities?.reduce((acc, activity) => {
    acc[activity.action] = (acc[activity.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalActions = activities?.length || 0;
  const uniqueDays = new Set(activities?.map(a => a.created_at.split('T')[0])).size;
  const avgActionsPerDay = uniqueDays > 0 ? Math.round(totalActions / uniqueDays) : 0;

  // Get most active day
  const dailyActivity = activities?.reduce((acc, activity) => {
    const date = activity.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const mostActiveDay = Object.entries(dailyActivity).reduce((max, [date, count]) => 
    count > max.count ? { date, count } : max, 
    { date: '', count: 0 }
  );

  return NextResponse.json({
    stats: {
      totalActions,
      uniqueDays,
      avgActionsPerDay,
      actionCounts,
      mostActiveDay,
      period,
    },
  });
}

// POST - Log user activity
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, details, target_user_id, ip_address, user_agent } = body;

    if (!action || !details) {
      return NextResponse.json({ error: 'Action and details are required' }, { status: 400 });
    }

    const { data: activity, error } = await supabase
      .from('user_activity')
      .insert({
        user_id: session.user.id,
        action,
        details,
        target_user_id,
        ip_address,
        user_agent,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging user activity:', error);
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

 