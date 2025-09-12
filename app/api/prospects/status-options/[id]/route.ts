import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

// GET /api/prospects/status-options/[id] - Get a specific status option
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const params = await context.params;
    const statusOptionId = params.id;
    
    const { data: statusOption, error } = await supabase
      .from('prospect_status_options')
      .select('*')
      .eq('id', statusOptionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Status option not found' }, { status: 404 });
      }
      console.error('Error fetching status option:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ statusOption }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/prospects/status-options/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/prospects/status-options/[id] - Update a status option
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
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

    // Only admin and dev users can update status options
    if (!['admin', 'dev'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const params = await context.params;
    const statusOptionId = params.id;
    const body = await req.json();
    const { name, color, description, is_active, sort_order } = body;
    
    // Check if status option exists
    const { data: existingOption, error: checkError } = await supabase
      .from('prospect_status_options')
      .select('id, name')
      .eq('id', statusOptionId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Status option not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // Validate color format if provided
    if (color) {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(color)) {
        return NextResponse.json({ error: 'Invalid color format. Use hex format like #FF0000' }, { status: 400 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    
    const { data: result, error } = await supabase
      .from('prospect_status_options')
      .update(updateData)
      .eq('id', statusOptionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating status option:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A status option with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ statusOption: result }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/prospects/status-options/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prospects/status-options/[id] - Delete a status option
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
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

    // Only admin and dev users can delete status options
    if (!['admin', 'dev'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const params = await context.params;
    const statusOptionId = params.id;
    
    // Check if status option exists
    const { data: existingOption, error: checkError } = await supabase
      .from('prospect_status_options')
      .select('id, name')
      .eq('id', statusOptionId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Status option not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // Check if any prospects are using this status
    const { data: prospectsUsingStatus, error: usageError } = await supabase
      .from('prospects')
      .select('id')
      .eq('status', existingOption.name)
      .limit(1);
    
    if (usageError) {
      console.error('Error checking status usage:', usageError);
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    if (prospectsUsingStatus && prospectsUsingStatus.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete status option "${existingOption.name}" because it is being used by ${prospectsUsingStatus.length} prospect(s). Please update or remove the prospects first.` 
      }, { status: 409 });
    }
    
    const { error } = await supabase
      .from('prospect_status_options')
      .delete()
      .eq('id', statusOptionId);
    
    if (error) {
      console.error('Error deleting status option:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Status option deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/prospects/status-options/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
