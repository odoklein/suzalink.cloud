import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const fuzzy = searchParams.get('fuzzy');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDir = searchParams.get('sortDir') || 'desc';

    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      // Exact search by name or email
      query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    } else if (fuzzy) {
      // Fuzzy search for partial matches
      query = query.or(`name.ilike.%${fuzzy}%,contact_email.ilike.%${fuzzy}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortDir === 'asc' });
    query = query.range(from, to);

    const { data: clients, error, count } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return NextResponse.json({
      clients: clients || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error in clients API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await req.json();
    const { userId, name, contact_email, company, phone, status, region } = body;

    if (!name || !contact_email) {
      return NextResponse.json({ 
        error: 'name and contact_email are required' 
      }, { status: 400 });
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId || null,
        name,
        contact_email,
        company: company || null,
        phone: phone || null,
        status: status || 'active',
        region: region || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    // Log activity
    try {
      if (userId) {
        await ActivityHelpers.logClientCreated(userId, name, client.id);
      }
    } catch (logError) {
      console.error('Error logging client creation:', logError);
    }

    return NextResponse.json({ client });

  } catch (error) {
    console.error('Error in clients API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 