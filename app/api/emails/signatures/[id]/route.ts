import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createClient } from '@/lib/supabase-server';

// GET /api/emails/signatures/[id] - Get a specific email signature
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
      .from('email_signatures')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching email signature:', error);
      return NextResponse.json({ error: 'Failed to fetch email signature' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in GET /api/emails/signatures/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/emails/signatures/[id] - Update a specific email signature
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
    const { name, content, isDefault } = await req.json();
    
    if (!name || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();
    
    // First verify that the signature belongs to the user
    const { data: existingSignature, error: fetchError } = await supabase
      .from('email_signatures')
      .select('id')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !existingSignature) {
      return NextResponse.json({ error: 'Signature not found or access denied' }, { status: 404 });
    }
    
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
      .update({
        name,
        content,
        is_default: isDefault || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating email signature:', error);
      return NextResponse.json({ error: 'Failed to update email signature' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in PUT /api/emails/signatures/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/emails/signatures/[id] - Delete a specific email signature
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
      .from('email_signatures')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('Error deleting email signature:', error);
      return NextResponse.json({ error: 'Failed to delete email signature' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/emails/signatures/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
