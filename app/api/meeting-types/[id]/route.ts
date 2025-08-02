import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/meeting-types/[id] - Get a specific meeting type
export async function GET(req: NextRequest, { params }: any) {
  try {
    const { data, error } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Meeting type not found' }, { status: 404 });
    }

    return NextResponse.json({ meeting_type: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/meeting-types/[id] - Update a meeting type
export async function PUT(req: NextRequest, { params }: any) {
  try {
    const updateData = await req.json();

    const { data, error } = await supabase
      .from('meeting_types')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ meeting_type: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/meeting-types/[id] - Delete a meeting type
export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const { error } = await supabase
      .from('meeting_types')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 