import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/prospects/lists - Get all prospect lists for the current user
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
    
    // Get prospect lists with correct counts
    let query = supabase
      .from('prospect_lists')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: lists, error } = await query;

    if (error) {
      console.error('Error fetching prospect lists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Fetched lists:', lists?.length || 0, 'lists');

    // ROLE-BASED FILTERING: Filter lists based on user access
    let filteredLists = lists || [];

    if (userProfile.role !== 'admin') {
      // Non-admin users can only see lists they created or are assigned to
      filteredLists = await Promise.all(
        (lists || []).map(async (list) => {
          const { data: hasAccess } = await supabase.rpc('user_has_list_access', {
            user_uuid: session.user.id,
            list_uuid: list.id
          });
          return hasAccess ? list : null;
        })
      );
      filteredLists = filteredLists.filter(list => list !== null);
    }

    // Fix prospect counts for filtered lists
    if (filteredLists && filteredLists.length > 0) {
      for (const list of filteredLists) {
        // Get actual count for this list
        const { count } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);

        // Update count if different
        if (list.prospect_count !== count) {
          await supabase
            .from('prospect_lists')
            .update({ prospect_count: count })
            .eq('id', list.id);
        }

        // Override the count in the response
        list.prospect_count = count;
      }
    }

    return NextResponse.json({ lists: filteredLists });
  } catch (error) {
    console.error('Error in GET /api/prospects/lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prospects/lists - Create a new prospect list
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { 
      name, 
      description, 
      defaultInterlocuteurName, 
      defaultInterlocuteurEmail, 
      defaultInterlocuteurPhone, 
      defaultInterlocuteurPosition 
    } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Build insert data with only provided fields
    const insertData: any = {
      name,
      description,
      created_by: session.user.id,
      status: 'active',
      prospect_count: 0
    };

    // Only add default interlocuteur fields if they are provided
    if (defaultInterlocuteurName) insertData.default_interlocuteur_name = defaultInterlocuteurName;
    if (defaultInterlocuteurEmail) insertData.default_interlocuteur_email = defaultInterlocuteurEmail;
    if (defaultInterlocuteurPhone) insertData.default_interlocuteur_phone = defaultInterlocuteurPhone;
    if (defaultInterlocuteurPosition) insertData.default_interlocuteur_position = defaultInterlocuteurPosition;

    const { data, error } = await supabase
      .from('prospect_lists')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prospect list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_list_created',
      `Created prospect list: ${name}`
    );

    return NextResponse.json({ list: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/prospects/lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
