import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/emails/templates - Get all email templates for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('email_templates')
      .select(`
        *,
        email_template_categories (
          id,
          name,
          color,
          is_default
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching email templates:', error);
      return NextResponse.json({ error: 'Failed to fetch email templates' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/emails/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/emails/templates - Create a new email template
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, subject, content, category_id } = await req.json();

    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Validate category if provided
    if (category_id) {
      const { data: category } = await supabase
        .from('email_template_categories')
        .select('id')
        .eq('id', category_id)
        .eq('user_id', session.user.id)
        .single();

      if (!category) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: session.user.id,
        name,
        subject,
        content,
        category_id: category_id || null
      })
      .select(`
        *,
        email_template_categories (
          id,
          name,
          color,
          is_default
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating email template:', error);
      return NextResponse.json({ error: 'Failed to create email template' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/emails/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
