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
    
    // Get query parameters
    const url = new URL(req.url);
    const clientId = url.searchParams.get('clientId');
    
    // Get prospect lists with correct counts
    let query = supabase
      .from('prospect_lists')
      .select(`
        *,
        clients (id, name)
      `)
      .order('created_at', { ascending: false });

    // Filter by client if provided
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // ROLE-BASED FILTERING: Commercial users can only see lists assigned to them
    if (userProfile.role === 'commercial') {
      // Get lists where the user is a contributor
      const { data: contributorLists, error: contributorError } = await supabase
        .from('prospect_list_contributors')
        .select('prospect_list_id')
        .eq('user_id', session.user.id);
      
      if (contributorError) {
        console.error('Error fetching contributor lists:', contributorError);
        return NextResponse.json({ error: 'Failed to fetch assigned lists' }, { status: 500 });
      }
      
      const assignedListIds = contributorLists?.map(c => c.prospect_list_id) || [];
      
      if (assignedListIds.length === 0) {
        // Commercial user has no assigned lists
        return NextResponse.json({ lists: [] });
      }
      
      // Filter query to only include assigned lists
      query = query.in('id', assignedListIds);
    }
    // Admin and Dev can see all lists (no additional filtering needed)

    const { data: lists, error } = await query;

    if (error) {
      console.error('Error fetching prospect lists:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fix prospect counts for all lists and fetch contributors
    if (lists && lists.length > 0) {
      // Get all contributors for these lists with user information
      const listIds = lists.map(list => list.id);

      const { data: contributorRecords, error: contributorsError } = await supabase
        .from('prospect_list_contributors')
        .select('prospect_list_id, user_id')
        .in('prospect_list_id', listIds);

      if (contributorsError) {
        console.error('Error fetching contributors:', contributorsError);
      }

      // Get user details from auth.users
      let userDetails: Record<string, any> = {};
      if (contributorRecords && contributorRecords.length > 0) {
        const userIds = contributorRecords.map(c => c.user_id);
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
          console.error('Error fetching auth users:', authError);
        } else if (authUsers?.users) {
          authUsers.users.forEach(user => {
            if (userIds.includes(user.id)) {
              userDetails[user.id] = {
                id: user.id,
                name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                email: user.email || ''
              };
            }
          });
        }
      }

      // Group contributors by list_id
      const contributorsByList: Record<string, any[]> = {};
      if (contributorRecords) {
        contributorRecords.forEach((contributor: any) => {
          if (!contributorsByList[contributor.prospect_list_id]) {
            contributorsByList[contributor.prospect_list_id] = [];
          }
          const userDetail = userDetails[contributor.user_id];
          if (userDetail) {
            contributorsByList[contributor.prospect_list_id].push(userDetail);
          }
        });
      }


      for (const list of lists) {
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

        // Add contributors for this list
        list.contributors = contributorsByList[list.id] || [];
      }
    }
    return NextResponse.json({ lists });
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
    const { name, description, clientId, userId, contributors } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    
    const { data, error } = await supabase
      .from('prospect_lists')
      .insert({
        name,
        description,
        client_id: clientId || null,
        created_by: session.user.id,
        status: 'active',
        prospect_count: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating prospect list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add contributors if provided
    if (contributors && Array.isArray(contributors) && contributors.length > 0) {
      const contributorInserts = contributors.map((contributorId: string) => ({
        prospect_list_id: data.id,
        user_id: contributorId,
        assigned_by: session.user.id
      }));

      const { error: contributorError } = await supabase
        .from('prospect_list_contributors')
        .insert(contributorInserts);

      if (contributorError) {
        console.error('Error adding contributors:', contributorError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'prospect_list_created',
      `Created prospect list: ${name}${contributors?.length ? ` with ${contributors.length} contributors` : ''}`
    );

    return NextResponse.json({ list: data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/prospects/lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}