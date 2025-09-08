import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@/lib/supabase-server';

// GET /api/emails/templates/[id] - Get a specific email template
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching email template:', error);
      return NextResponse.json({ error: 'Failed to fetch email template' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in GET /api/emails/templates/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/emails/templates/[id] - Update a specific email template
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { name, subject, content } = await req.json();
    
    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    
    // First verify that the template belongs to the user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }
    
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name,
        subject,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating email template:', error);
      return NextResponse.json({ error: 'Failed to update email template' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in PUT /api/emails/templates/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/emails/templates/[id] - Delete a specific email template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createClient();
    
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('Error deleting email template:', error);
      return NextResponse.json({ error: 'Failed to delete email template' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/emails/templates/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
