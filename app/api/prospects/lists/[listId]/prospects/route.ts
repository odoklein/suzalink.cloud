import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/prospects/lists/[listId]/prospects - Get all prospects for a list
export async function GET(
  req: NextRequest,
  context: { params: { listId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const params = await context.params;
    
    const listId = params.listId;
    
    // Get query parameters for pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Get prospects
    const { data: prospects, error, count } = await supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
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
    console.error(`Error in GET /api/prospects/lists/[listId]/prospects:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prospects/lists/[listId]/prospects - Add a new prospect to a list
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
    const body = await req.json();
    const { data } = body;
    
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid prospect data' }, { status: 400 });
    }
    
    // Check if list exists
    const { data: list, error: listError } = await supabase
      .from('prospect_lists')
      .select('id, name')
      .eq('id', listId)
      .single();
    
    if (listError) {
      if (listError.code === 'PGRST116') {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    
    // Check for phone numbers in the data
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{7,20}$/;
    let hasPhone = false;
    let phoneNumber = null;
    let phoneColumn = null;
    
    // Get columns to identify phone columns
    const { data: columns } = await supabase
      .from('prospect_columns')
      .select('column_name, is_phone')
      .eq('list_id', listId);
    
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
    
    // Insert the prospect
    const { data: prospect, error } = await supabase
      .from('prospects')
      .insert({
        list_id: listId,
        data,
        has_phone: hasPhone,
        phone_number: phoneNumber,
        phone_column: phoneColumn,
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prospect:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update prospect count in the list
    await supabase.rpc('increment_prospect_count', { list_id: listId });
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_created',
      `Added prospect to list: ${list.name}`
    );
    
    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    console.error(`Error in POST /api/prospects/lists/[listId]/prospects:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}