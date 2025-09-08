import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// PUT /api/invoices/templates/[templateId] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      template_name,
      is_default,
      layout_config
    } = body;

    // Verify template ownership
    const { data: existingTemplate } = await supabase
      .from('invoice_templates')
      .select('id, is_default')
      .eq('id', params.templateId)
      .eq('user_id', session.user.id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (is_default && !existingTemplate.is_default) {
      await supabase
        .from('invoice_templates')
        .update({ is_default: false })
        .eq('user_id', session.user.id);
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (template_name !== undefined) updateData.template_name = template_name;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (layout_config !== undefined) updateData.layout_config = layout_config;

    const { data: template, error } = await supabase
      .from('invoice_templates')
      .update(updateData)
      .eq('id', params.templateId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoices/templates/[templateId] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify template ownership
    const { data: template } = await supabase
      .from('invoice_templates')
      .select('id, template_name, is_default')
      .eq('id', params.templateId)
      .eq('user_id', session.user.id)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Don't allow deletion of default template
    if (template.is_default) {
      return NextResponse.json({
        error: 'Cannot delete default template'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('invoice_templates')
      .delete()
      .eq('id', params.templateId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
