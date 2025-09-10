import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';
import { createNotification } from '@/lib/notification-utils';
import { NotificationType, NotificationPriority } from '@/types/notification';

// GET /api/prospects - Get prospects with filtering
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    
    const url = new URL(req.url);
    const listId = url.searchParams.get('listId');
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('prospects')
      .select(`
        *,
        prospect_interlocuteurs(*),
        prospect_assignments(
          user_id,
          users(id, full_name, email)
        ),
        prospect_lists(id, name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (listId) {
      query = query.eq('list_id', listId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    // ROLE-BASED FILTERING: Commercial users can only see assigned prospects
    // Note: Since assigned_to column is removed, commercial users will see all prospects for now
    // You may want to implement list-based permissions instead
    if (userProfile.role === 'commercial') {
      // For now, show all prospects to commercial users
      // Later you can filter based on assigned lists
    }

    const { data: prospects, error, count } = await query;

    if (error) {
      console.error('Error fetching prospects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      prospects,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/prospects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prospects - Create a new prospect
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { listId, name, email, phone, industry, website, status, notes } = body;
    
    if (!listId || !name) {
      return NextResponse.json({ error: 'List ID and name are required' }, { status: 400 });
    }
    
    // Build the data JSONB object
    const data: any = {
      name: name.trim(),
    };

    // Add other fields to data if they exist
    if (email?.trim()) data.email = email.trim();
    if (phone?.trim()) data.phone = phone.trim();
    if (industry?.trim()) data.industry = industry.trim();
    if (website?.trim()) data.website = website.trim();
    if (notes?.trim()) data.notes = notes.trim();

    const { data: result, error } = await supabase
      .from('prospects')
      .insert({
        list_id: listId,
        data: data,
        status: status || 'nouveau',
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prospect:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_created',
      `Created prospect: ${name}`
    );

    // Create notifications for users assigned to this list
    try {
      const { data: assignedUsers, error: assignError } = await supabase
        .from('prospect_list_assignments')
        .select(`
          user_id,
          users!prospect_list_assignments_user_id_fkey(id, full_name, email)
        `)
        .eq('list_id', listId);

      if (!assignError && assignedUsers) {
        // Notify all assigned users about the new prospect
        for (const assignment of assignedUsers) {
          if (assignment.user_id !== session.user.id) { // Don't notify the creator
            await createNotification({
              userId: assignment.user_id,
              type: NotificationType.PROSPECT_ASSIGNED,
              title: 'Nouveau prospect ajouté',
              message: `Un nouveau prospect "${name}" a été ajouté à votre liste`,
              priority: NotificationPriority.MEDIUM,
              data: {
                prospectId: result.id,
                listId: listId,
                prospectName: name,
                createdBy: session.user.id
              },
              actionUrl: `/dashboard/prospects?listId=${listId}`,
              actionLabel: 'Voir le prospect'
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('Error creating new prospect notification:', notificationError);
      // Don't fail the creation if notification fails
    }

    return NextResponse.json({ prospect: result }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/prospects:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

