import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// PUT /api/emails/signatures/[id]/default - Set a signature as default
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
    const supabase = await createServerSupabaseClient();
    
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
    
    // Clear any existing default signatures
    await supabase
      .from('email_signatures')
      .update({ is_default: false })
      .eq('user_id', session.user.id)
      .eq('is_default', true);
    
    // Set this signature as default
    const { data, error } = await supabase
      .from('email_signatures')
      .update({
        is_default: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error setting default signature:', error);
      return NextResponse.json({ error: 'Failed to set default signature' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error in PUT /api/emails/signatures/${params.id}/default:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
