import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';
import { notifyProspectListAssigned } from '@/lib/notification-utils';

// POST /api/prospects/assign-client - Assign a client to a prospect list
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { listId, clientId } = body;
    
    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }
    
    // Check if list exists
    const { data: list, error: listError } = await supabase
      .from('prospect_lists')
      .select('id, name, client_id')
      .eq('id', listId)
      .single();
    
    if (listError) {
      if (listError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    
    // If clientId is null, we're removing the client assignment
    if (clientId === null) {
      const { error } = await supabase
        .from('prospect_lists')
        .update({ client_id: null, updated_at: new Date().toISOString() })
        .eq('id', listId);
      
      if (error) {
        console.error('Error removing client assignment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Log activity
      await ActivityHelpers.logUserActivity(
        session.user.id,
        'prospect_list_unassigned',
        `Removed client assignment from list: ${list.name}`
      );
      
      return NextResponse.json({ success: true, message: 'Client assignment removed' });
    }
    
    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', clientId)
      .single();
    
    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    }
    
    // Assign client to list
    const { error } = await supabase
      .from('prospect_lists')
      .update({ client_id: clientId, updated_at: new Date().toISOString() })
      .eq('id', listId);
    
    if (error) {
      console.error('Error assigning client:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await ActivityHelpers.logProspectAssigned(
      session.user.id,
      list.name,
      client.name
    );

    // Send notification to the assigned client
    try {
      await notifyProspectListAssigned(
        listId,
        list.name,
        clientId,
        session.user.name || session.user.email || 'Système'
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `List "${list.name}" assigned to client "${client.name}"`
    });
  } catch (error) {
    console.error('Error in POST /api/prospects/assign-client:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}