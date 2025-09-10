import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// POST /api/prospects/interlocuteurs - Add an interlocuteur to a prospect
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { prospectId, name, email, phone, position, notes } = body;
    
    if (!prospectId || !name?.trim()) {
      return NextResponse.json({ error: 'Prospect ID and name are required' }, { status: 400 });
    }
    
    // Check if prospect exists
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('id, data')
      .eq('id', prospectId)
      .single();
    
    if (prospectError) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }
    
    // Insert interlocuteur
    const { data, error } = await supabase
      .from('prospect_interlocuteurs')
      .insert({
        prospect_id: prospectId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        position: position?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting interlocuteur:', error);
      return NextResponse.json({ error: 'Failed to add interlocuteur' }, { status: 500 });
    }
    
    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'interlocuteur_added',
      `Added interlocuteur "${name}" to prospect "${prospect.data.name}"`
    );
    
    return NextResponse.json({ interlocuteur: data });
  } catch (error) {
    console.error('Error in POST /api/prospects/interlocuteurs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/prospects/interlocuteurs?prospectId=xxx - Get interlocuteurs for a prospect
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(req.url);
    const prospectId = url.searchParams.get('prospectId');
    
    if (!prospectId) {
      return NextResponse.json({ error: 'Prospect ID is required' }, { status: 400 });
    }
    
    const { data: interlocuteurs, error } = await supabase
      .from('prospect_interlocuteurs')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching interlocuteurs:', error);
      return NextResponse.json({ error: 'Failed to fetch interlocuteurs' }, { status: 500 });
    }
    
    return NextResponse.json({ interlocuteurs });
  } catch (error) {
    console.error('Error in GET /api/prospects/interlocuteurs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

