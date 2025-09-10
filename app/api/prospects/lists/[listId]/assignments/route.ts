import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';
import { NotificationType, NotificationPriority } from '@/types/notification';

// GET /api/prospects/lists/[listId]/assignments - Get users assigned to a list
export async function GET(
  req: NextRequest,
  context: { params: { listId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listId = params.listId;

    // Check if user has access to this list
    const { data: hasAccess } = await supabase.rpc('user_has_list_access', {
      user_uuid: session.user.id,
      list_uuid: listId
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get assigned users using the function
    const { data: assignedUsers, error } = await supabase.rpc('get_list_assigned_users', {
      list_uuid: listId
    });

    if (error) {
      console.error('Error fetching assigned users:', error);
      return NextResponse.json({ error: 'Failed to fetch assigned users' }, { status: 500 });
    }

    return NextResponse.json({ assignedUsers: assignedUsers || [] });

  } catch (error) {
    console.error('Error in GET /api/prospects/lists/[listId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prospects/lists/[listId]/assignments - Assign a user to a list
export async function POST(
  req: NextRequest,
  context: { params: { listId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listId = params.listId;
    const { userId, canEdit = true, canDelete = false } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user has permission to assign (creator or admin)
    const { data: listData, error: listError } = await supabase
      .from('prospect_lists')
      .select('created_by')
      .eq('id', listId)
      .single();

    if (listError) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get user role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only creator or admin can assign users
    if (listData.created_by !== session.user.id && userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied: Only list creator or admin can assign users' }, { status: 403 });
    }

    // Assign the user
    const { data, error } = await supabase
      .from('prospect_list_assignments')
      .upsert({
        list_id: listId,
        user_id: userId,
        assigned_by: session.user.id,
        can_edit: canEdit,
        can_delete: canDelete
      }, {
        onConflict: 'list_id,user_id'
      })
      .select(`
        *,
        users!prospect_list_assignments_user_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error assigning user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get list name for notification
    const { data: listInfo } = await supabase
      .from('prospect_lists')
      .select('name')
      .eq('id', listId)
      .single();

    // Create notification for the assigned user using the notification utility
    try {
      const { createNotification } = await import('@/lib/notification-utils');
      await createNotification({
        userId: userId,
        type: NotificationType.PROSPECT_LIST_ASSIGNED,
        title: 'Nouvelle liste assignée',
        message: `Vous avez été assigné à la liste "${listInfo?.name || 'Prospects'}"`,
        priority: NotificationPriority.HIGH,
        data: {
          listId: listId,
          listName: listInfo?.name,
          assignedBy: session.user.id,
          canEdit: canEdit,
          canDelete: canDelete
        },
        actionUrl: `/dashboard/prospects?listId=${listId}`,
        actionLabel: 'Voir la liste'
      });
    } catch (notificationError) {
      console.error('Error creating list assignment notification:', notificationError);
      // Don't fail the assignment if notification fails
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'list_assigned',
      `Assigned user ${data.users?.full_name || 'Unknown'} to list ${listInfo?.name || 'Unknown'}`
    );

    return NextResponse.json({
      assignment: data,
      message: 'User assigned successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/prospects/lists/[listId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prospects/lists/[listId]/assignments - Unassign a user from a list
export async function DELETE(
  req: NextRequest,
  context: { params: { listId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const listId = params.listId;

    // Check if user has permission to unassign
    const { data: listData, error: listError } = await supabase
      .from('prospect_lists')
      .select('created_by')
      .eq('id', listId)
      .single();

    if (listError) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get user role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only creator, admin, or the user themselves can unassign
    if (listData.created_by !== session.user.id &&
        userProfile.role !== 'admin' &&
        userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Remove the assignment
    const { error } = await supabase
      .from('prospect_list_assignments')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unassigning user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get user info for activity log
    const { data: userInfo } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Get list name for activity log
    const { data: listInfo } = await supabase
      .from('prospect_lists')
      .select('name')
      .eq('id', listId)
      .single();

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'list_unassigned',
      `Unassigned user ${userInfo?.full_name || 'Unknown'} from list ${listInfo?.name || 'Unknown'}`
    );

    return NextResponse.json({ message: 'User unassigned successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/prospects/lists/[listId]/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
