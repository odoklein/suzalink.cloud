import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, attachmentIds } = await request.json();

    if (!messageId || !attachmentIds || !Array.isArray(attachmentIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Update all attachments with the message ID
    const { data, error } = await supabase
      .from('message_attachments')
      .update({ message_id: messageId })
      .in('id', attachmentIds)
      .eq('uploaded_by', session.user.id); // Security: only update user's own attachments

    if (error) {
      console.error('Error updating attachment message IDs:', error);
      return NextResponse.json({ error: 'Failed to update attachments' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0
    });
  } catch (error) {
    console.error('Update message ID API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
