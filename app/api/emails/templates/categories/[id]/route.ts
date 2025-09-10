import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// PUT /api/emails/templates/categories/[id] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { name, description, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if category exists and belongs to user
    const { data: existingCategory, error: fetchError } = await supabase
      .from('email_template_categories')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent editing default categories
    if (existingCategory.is_default) {
      return NextResponse.json({ error: 'Cannot modify default categories' }, { status: 403 });
    }

    // Check if new name conflicts with existing category
    const { data: conflictingCategory } = await supabase
      .from('email_template_categories')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (conflictingCategory) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('email_template_categories')
      .update({
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3B82F6'
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/emails/templates/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/emails/templates/categories/[id] - Delete a category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = await createServerSupabaseClient();

    // Check if category exists and belongs to user
    const { data: existingCategory, error: fetchError } = await supabase
      .from('email_template_categories')
      .select('id, is_default')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent deleting default categories
    if (existingCategory.is_default) {
      return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 403 });
    }

    // Move templates to "General" category before deleting
    const { data: generalCategory } = await supabase
      .from('email_template_categories')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('name', 'General')
      .single();

    if (generalCategory) {
      await supabase
        .from('email_templates')
        .update({ category_id: generalCategory.id })
        .eq('category_id', id)
        .eq('user_id', session.user.id);
    }

    // Delete the category
    const { error } = await supabase
      .from('email_template_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting category:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/emails/templates/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

