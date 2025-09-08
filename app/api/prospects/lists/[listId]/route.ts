import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/prospects/lists/[listId] - Get a specific prospect list with its columns and prospects
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
    
    // Get list details
    const { data: list, error: listError } = await supabase
      .from('prospect_lists')
      .select(`
        *,
        clients (id, name)
      `)
      .eq('id', listId)
      .single();
    
    if (listError) {
      if (listError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users can only access lists assigned to them
    if (userProfile.role === 'commercial') {
      // Check if the user is a contributor to this list
      const { data: contributorCheck, error: contributorError } = await supabase
        .from('prospect_list_contributors')
        .select('id')
        .eq('prospect_list_id', listId)
        .eq('user_id', session.user.id)
        .single();
      
      if (contributorError || !contributorCheck) {
        return NextResponse.json({ error: 'Access denied: You are not assigned to this list' }, { status: 403 });
      }
    }
    // Admin and Dev can access all lists (no additional check needed)
    
    // Get columns
    const { data: columns, error: columnsError } = await supabase
      .from('prospect_columns')
      .select('*')
      .eq('list_id', listId)
      .order('display_order', { ascending: true });
    
    if (columnsError) {
      return NextResponse.json({ error: columnsError.message }, { status: 500 });
    }
    
    // Get prospects (paginated)
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const { data: prospects, error: prospectsError, count } = await supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (prospectsError) {
      return NextResponse.json({ error: prospectsError.message }, { status: 500 });
    }

    // Fix prospect count if it's incorrect
    if (list.prospect_count !== count) {
      await supabase
        .from('prospect_lists')
        .update({ prospect_count: count })
        .eq('id', listId);
    }
    
    // Use the correct count from the prospects query
    const correctList = { ...list, prospect_count: count };

    return NextResponse.json({
      list: correctList,
      columns,
      prospects,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error(`Error in GET /api/prospects/lists/[listId]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/prospects/lists/[listId] - Update a prospect list
export async function PUT(
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
    const body = await req.json();
    const { name, description, clientId, status } = body;
    
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
    
    // Check if list exists
    const { data: existingList, error: checkError } = await supabase
      .from('prospect_lists')
      .select('id, name')
      .eq('id', listId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users can only modify lists assigned to them
    if (userProfile.role === 'commercial') {
      // Check if the user is a contributor to this list
      const { data: contributorCheck, error: contributorError } = await supabase
        .from('prospect_list_contributors')
        .select('id')
        .eq('prospect_list_id', listId)
        .eq('user_id', session.user.id)
        .single();
      
      if (contributorError || !contributorCheck) {
        return NextResponse.json({ error: 'Access denied: You are not assigned to this list' }, { status: 403 });
      }
    }
    // Admin and Dev can modify all lists (no additional check needed)
    
    // Update the list
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (clientId !== undefined) updateData.client_id = clientId;
    if (status) updateData.status = status;
    
    const { data, error } = await supabase
      .from('prospect_lists')
      .update(updateData)
      .eq('id', listId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating prospect list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_list_updated',
      `Updated prospect list: ${existingList.name}`
    );
    
    return NextResponse.json({ list: data });
  } catch (error) {
    console.error(`Error in PUT /api/prospects/lists/[listId]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prospects/lists/[listId] - Delete a prospect list
export async function DELETE(
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
    
    // Check if list exists and get its name for the activity log
    const { data: existingList, error: checkError } = await supabase
      .from('prospect_lists')
      .select('id, name')
      .eq('id', listId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }
    
    // ROLE-BASED ACCESS CONTROL: Commercial users can only delete lists assigned to them
    if (userProfile.role === 'commercial') {
      // Check if the user is a contributor to this list
      const { data: contributorCheck, error: contributorError } = await supabase
        .from('prospect_list_contributors')
        .select('id')
        .eq('prospect_list_id', listId)
        .eq('user_id', session.user.id)
        .single();
      
      if (contributorError || !contributorCheck) {
        return NextResponse.json({ error: 'Access denied: You are not assigned to this list' }, { status: 403 });
      }
    }
    // Admin and Dev can delete all lists (no additional check needed)
    
    // Delete the list (cascade will delete prospects and columns)
    const { error } = await supabase
      .from('prospect_lists')
      .delete()
      .eq('id', listId);
    
    if (error) {
      console.error('Error deleting prospect list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_list_deleted',
      `Deleted prospect list: ${existingList.name}`
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/prospects/lists/[listId]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}