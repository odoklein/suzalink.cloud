import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/email-templates - Get all email templates for the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/email-templates - Create a new email template
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, subject, content, type } = body;

    if (!name?.trim() || !subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        subject: subject.trim(),
        content: content.trim(),
        type: type || 'custom'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'email_template_created',
      `Created email template: ${name}`
    );

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Error in POST /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

