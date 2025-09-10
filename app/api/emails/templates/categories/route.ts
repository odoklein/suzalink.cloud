import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/emails/templates/categories - Get all categories for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('email_template_categories')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/emails/templates/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/emails/templates/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Check if category name already exists for this user
    const { data: existing } = await supabase
      .from('email_template_categories')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('email_template_categories')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim(),
        color: color || '#3B82F6',
        is_default: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/emails/templates/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

