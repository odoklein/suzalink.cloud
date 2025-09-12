import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

// GET /api/prospects/status-options - Get all status options
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
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    
    let query = supabase
      .from('prospect_status_options')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    // Only show active options by default, unless specifically requested
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: statusOptions, error } = await query;

    if (error) {
      console.error('Error fetching status options:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ statusOptions }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/prospects/status-options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prospects/status-options - Create a new status option
export async function POST(req: NextRequest) {
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

    // Only admin and dev users can create status options
    if (!['admin', 'dev'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    const { name, color, description, sort_order } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate color format (hex color)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (color && !colorRegex.test(color)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex format like #FF0000' }, { status: 400 });
    }
    
    const { data: result, error } = await supabase
      .from('prospect_status_options')
      .insert({
        name: name.trim(),
        color: color || '#6B7280',
        description: description?.trim() || null,
        sort_order: sort_order || 0,
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating status option:', error);
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'A status option with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ statusOption: result }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/prospects/status-options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
