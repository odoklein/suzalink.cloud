import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/emails/signatures - Get all email signatures for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching email signatures:', error);
      return NextResponse.json({ error: 'Failed to fetch email signatures' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/emails/signatures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/emails/signatures - Create a new email signature
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, content, isDefault } = await req.json();
    
    if (!name || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    
    // If this is set as default, clear other defaults first
    if (isDefault) {
      await supabase
        .from('email_signatures')
        .update({ is_default: false })
        .eq('user_id', session.user.id)
        .eq('is_default', true);
    }
    
    const { data, error } = await supabase
      .from('email_signatures')
      .insert({
        user_id: session.user.id,
        name,
        content,
        is_default: isDefault || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating email signature:', error);
      return NextResponse.json({ error: 'Failed to create email signature' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/emails/signatures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
