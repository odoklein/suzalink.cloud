import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';
import { createNotification } from '@/lib/notification-utils';
import { NotificationType, NotificationPriority } from '@/types/notification';

// GET /api/prospects/[id] - Get a specific prospect
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prospectId = params.id;
    
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
    
    const { data: prospect, error } = await supabase
      .from('prospects')
      .select(`
        *,
        prospect_interlocuteurs(*),
        prospect_assignments(
          user_id,
          assigned_by,
          assigned_at
        ),
        prospect_lists(id, name),
        prospect_activities(
          *,
          users(id, full_name, email)
        )
      `)
      .eq('id', prospectId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users access control
    // Note: Since assigned_to column is removed, implement list-based access control later
    if (userProfile.role === 'commercial') {
      // For now, allow access to all prospects for commercial users
      // Later implement list-based permissions
    }
    // Admin and Dev can see all prospects (no additional check needed)
    
    return NextResponse.json({ prospect });
  } catch (error) {
    console.error(`Error in GET /api/prospects/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/prospects/[id] - Update a prospect
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prospectId = params.id;
    const body = await req.json();
    const { name, email, phone, industry, website, status, notes, isDataField } = body;
    
    console.log('Updating prospect:', prospectId, 'with data:', body);
    
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
    
    // Check if prospect exists
    const { data: existingProspect, error: checkError } = await supabase
      .from('prospects')
      .select('id, data, status')
      .eq('id', prospectId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users access control
    // Note: Since assigned_to column is removed, implement list-based access control later
    if (userProfile.role === 'commercial') {
      // For now, allow modification of all prospects for commercial users
      // Later implement list-based permissions
    }
    // Admin and Dev can modify all prospects (no additional check needed)
    
    // Update the prospect
    const updateData: any = {};

    // Handle data fields (stored in JSONB)
    if (isDataField) {
      const currentData = existingProspect.data || {};
      const fieldName = Object.keys(body).find(key => key !== 'isDataField');
      if (fieldName) {
        updateData.data = { ...currentData, [fieldName]: body[fieldName] };
      }
    } else {
      // Handle direct fields
      if (status) updateData.status = status;

      // Handle data fields that go into JSONB
      const dataUpdates: any = {};
      if (name !== undefined) dataUpdates.name = name;
      if (email !== undefined) dataUpdates.email = email;
      if (phone !== undefined) dataUpdates.phone = phone;
      if (industry !== undefined) dataUpdates.industry = industry;
      if (website !== undefined) dataUpdates.website = website;
      if (notes !== undefined) dataUpdates.notes = notes;

      if (Object.keys(dataUpdates).length > 0) {
        updateData.data = { ...existingProspect.data, ...dataUpdates };
      }
    }
    
    console.log('Update data constructed:', updateData);
    
    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      console.log('No data to update, returning 400');
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', prospectId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating prospect:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found or no changes made' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }
    
    // Log activity if status changed
    if (status && status !== existingProspect.status) {
      const prospectName = existingProspect.data?.name || 'Unknown Prospect';
      await ActivityHelpers.logUserActivity(
        session.user.id,
        'prospect_status_changed',
        `Changed prospect status from ${existingProspect.status} to ${status}: ${prospectName}`
      );

      // Create notification for prospect status change
      try {
        // Get users assigned to this prospect's list
        const { data: assignedUsers, error: assignError } = await supabase
          .from('prospect_list_assignments')
          .select(`
            user_id,
            users!prospect_list_assignments_user_id_fkey(id, full_name, email)
          `)
          .eq('list_id', existingProspect.list_id);

        if (!assignError && assignedUsers) {
          // Notify all assigned users about the status change
          for (const assignment of assignedUsers) {
            if (assignment.user_id !== session.user.id) { // Don't notify the user who made the change
              await createNotification({
                userId: assignment.user_id,
                type: NotificationType.PROSPECT_STATUS_CHANGED,
                title: 'Statut de prospect modifié',
                message: `Le statut de "${prospectName}" a changé de "${existingProspect.status}" à "${status}"`,
                priority: NotificationPriority.MEDIUM,
                data: {
                  prospectId: prospectId,
                  oldStatus: existingProspect.status,
                  newStatus: status,
                  changedBy: session.user.id
                },
                actionUrl: `/dashboard/prospects?listId=${existingProspect.list_id}`,
                actionLabel: 'Voir le prospect'
              });
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating prospect status change notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    // Handle rappel date notifications
    if (body.rappel_date) {
      try {
        const rappelDate = new Date(body.rappel_date);
        const prospectName = existingProspect.data?.name || 'Unknown Prospect';

        // Get users assigned to this prospect's list
        const { data: assignedUsers, error: assignError } = await supabase
          .from('prospect_list_assignments')
          .select(`
            user_id,
            users!prospect_list_assignments_user_id_fkey(id, full_name, email)
          `)
          .eq('list_id', existingProspect.list_id);

        if (!assignError && assignedUsers) {
          // Notify all assigned users about the rappel date
          for (const assignment of assignedUsers) {
            await createNotification({
              userId: assignment.user_id,
              type: NotificationType.PROSPECT_RAPPEL_DUE,
              title: 'Rappel programmé',
              message: `Rappel programmé pour "${prospectName}" le ${rappelDate.toLocaleDateString('fr-FR')}`,
              priority: NotificationPriority.MEDIUM,
              data: {
                prospectId: prospectId,
                rappelDate: rappelDate.toISOString(),
                prospectName: prospectName
              },
              actionUrl: `/dashboard/prospects?listId=${existingProspect.list_id}`,
              actionLabel: 'Voir le prospect'
            });
          }
        }
      } catch (notificationError) {
        console.error('Error creating rappel date notification:', notificationError);
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({ prospect: data });
  } catch (error) {
    console.error(`Error in PUT /api/prospects/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prospects/[id] - Delete a prospect
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prospectId = params.id;
    
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
    
    // Check if prospect exists and get its data for the activity log
    const { data: existingProspect, error: checkError } = await supabase
      .from('prospects')
      .select('id, data')
      .eq('id', prospectId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users access control
    // Note: Since assigned_to column is removed, implement list-based access control later
    if (userProfile.role === 'commercial') {
      // For now, allow deletion of all prospects for commercial users
      // Later implement list-based permissions
    }
    // Admin and Dev can delete all prospects (no additional check needed)
    
    // Delete the prospect (cascade will delete related data)
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospectId);
    
    if (error) {
      console.error('Error deleting prospect:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    const prospectName = existingProspect.data?.name || 'Unknown Prospect';
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_deleted',
      `Deleted prospect: ${prospectName}`
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/prospects/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
