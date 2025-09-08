import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/prospects/[id] - Get a specific prospect
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const params = await context.params;
    
    const id = params.id;
    
    const { data, error } = await supabase
      .from('prospects')
      .select(`
        *,
        prospect_lists (
          id,
          name,
          client_id,
          clients (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ prospect: data });
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
    
    const id = params.id;
    const body = await req.json();
    const { data, status, commentaire, rappel_date } = body;
    
    // Get current prospect data
    const { data: currentProspect, error: fetchError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Handle data updates (CSV columns)
    if (data && typeof data === 'object') {
      // Check for phone numbers in the updated data
      const phoneRegex = /^\+?[\d\s\-\(\)\.]{7,20}$/;
      let hasPhone = false;
      let phoneNumber = null;
      let phoneColumn = null;
      
      // Get columns to identify phone columns
      const { data: columns } = await supabase
        .from('prospect_columns')
        .select('column_name, is_phone')
        .eq('list_id', currentProspect.list_id);
      
      const phoneColumns = columns?.filter(col => col.is_phone) || [];
      
      // Check if any of the phone columns have a value in this prospect
      for (const col of phoneColumns) {
        if (data[col.column_name] && phoneRegex.test(data[col.column_name])) {
          hasPhone = true;
          phoneNumber = data[col.column_name];
          phoneColumn = col.column_name;
          break;
        }
      }
      
      // If no marked phone columns, try to detect phone numbers in any field
      if (!hasPhone) {
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string' && phoneRegex.test(value)) {
            hasPhone = true;
            phoneNumber = value;
            phoneColumn = key;
            break;
          }
        }
      }
      
      updateData.data = data;
      updateData.has_phone = hasPhone;
      updateData.phone_number = phoneNumber;
      updateData.phone_column = phoneColumn;
    }
    
    // Handle system column updates
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (commentaire !== undefined) {
      updateData.commentaire = commentaire;
    }
    
    if (rappel_date !== undefined) {
      updateData.rappel_date = rappel_date;
    }
    
    // Update the prospect
    const { data: updatedProspect, error } = await supabase
      .from('prospects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating prospect:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    let activityDetails = 'Updated prospect';
    if (status) activityDetails += ` status to ${status}`;
    if (commentaire !== undefined) activityDetails += ', added comment';
    if (rappel_date) activityDetails += ', set reminder';
    
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_updated',
      activityDetails
    );
    
    return NextResponse.json({ prospect: updatedProspect });
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
    
    const id = params.id;
    
    // Get prospect and list info before deletion
    const { data: prospect, error: fetchError } = await supabase
      .from('prospects')
      .select('list_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // Delete the prospect
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting prospect:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update prospect count in the list
    await supabase.rpc('decrement_prospect_count', { list_id: prospect.list_id });
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_deleted',
      `Deleted prospect from list`
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/prospects/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}