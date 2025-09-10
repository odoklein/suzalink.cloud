import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ActivityHelpers } from '@/lib/activity-logger';
import { auth } from '@/auth';

// GET /api/email-templates/[id] - Get a specific email template
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error(`Error in GET /api/email-templates/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/email-templates/[id] - Update an email template
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, subject, content, type } = body;

    if (!name?.trim() || !subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    // Check if template exists and belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('email_templates')
      .select('id, name')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name: name.trim(),
        subject: subject.trim(),
        content: content.trim(),
        type: type || 'custom'
      })
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'email_template_updated',
      `Updated email template: ${existing.name}`
    );

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error(`Error in PUT /api/email-templates/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/email-templates/[id] - Delete an email template
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const session = await auth();
    const params = await context.params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if template exists and belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('email_templates')
      .select('id, name')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting email template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await ActivityHelpers.logUserActivity(
      session.user.id,
      'email_template_deleted',
      `Deleted email template: ${existing.name}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/email-templates/[id]:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

