import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

// GET /api/prospects/analytics?listId=xxx - Get analytics data
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const listId = url.searchParams.get('listId');

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Build query based on role and list filter
    let query = supabase
      .from('prospects')
      .select(`
        id,
        list_id,
        status,
        prospect_lists!prospects_list_id_fkey(id, name),
        created_by_user:users!prospects_created_by_fkey(id, full_name),
        assigned_to_user:users!prospects_assigned_to_fkey(id, full_name)
      `);

    if (listId) {
      query = query.eq('list_id', listId);
    }

    // ROLE-BASED FILTERING
    // Note: Since assigned_to column is removed, commercial users can see all prospects for now
    // Later implement list-based filtering
    if (userProfile.role === 'commercial') {
      // For now, show all prospects to commercial users
      // Later you can filter based on assigned lists
    }

    const { data: prospects, error } = await query;

    if (error) {
      console.error('Error fetching prospects for analytics:', error);
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
    }

    // Calculate analytics
    const analytics = {
      totalProspects: prospects.length,
      prospectsByStatus: {} as Record<string, number>,
      prospectsByUser: [] as Array<{
        userId: string;
        userName: string;
        total: number;
        byStatus: Record<string, number>;
      }>,
      prospectsByList: [] as Array<{
        listId: string;
        listName: string;
        total: number;
        byStatus: Record<string, number>;
      }>
    };

    // Group by status
    prospects.forEach(prospect => {
      const status = prospect.status || 'nouveau';
      analytics.prospectsByStatus[status] = (analytics.prospectsByStatus[status] || 0) + 1;
    });

    // Group by user (use assigned_to if available, otherwise created_by)
    const userGroups = new Map<string, { name: string; prospects: typeof prospects }>();
    prospects.forEach(prospect => {
      const user = prospect.assigned_to_user || prospect.created_by_user;
      if (user) {
        const userId = user.id;
        const userName = user.full_name;

        if (!userGroups.has(userId)) {
          userGroups.set(userId, { name: userName, prospects: [] });
        }
        userGroups.get(userId)!.prospects.push(prospect);
      }
    });

    userGroups.forEach((data, userId) => {
      const byStatus: Record<string, number> = {};
      data.prospects.forEach(prospect => {
        const status = prospect.status || 'nouveau';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      analytics.prospectsByUser.push({
        userId,
        userName: data.name,
        total: data.prospects.length,
        byStatus
      });
    });

    // Group by list
    const listGroups = new Map<string, { name: string; prospects: typeof prospects }>();
    prospects.forEach(prospect => {
      const listId = prospect.list_id;
      const listName = prospect.prospect_lists?.name || 'Unknown';

      if (!listGroups.has(listId)) {
        listGroups.set(listId, { name: listName, prospects: [] });
      }
      listGroups.get(listId)!.prospects.push(prospect);
    });

    listGroups.forEach((data, listId) => {
      const byStatus: Record<string, number> = {};
      data.prospects.forEach(prospect => {
        const status = prospect.status || 'nouveau';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      analytics.prospectsByList.push({
        listId,
        listName: data.name,
        total: data.prospects.length,
        byStatus
      });
    });

    return NextResponse.json({ analytics });

  } catch (error) {
    console.error('Error in GET /api/prospects/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

