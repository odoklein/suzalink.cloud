import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const supabase = createClient();

    // Mark all messages in the conversation as read for the current user
    const { error } = await supabase.rpc('mark_messages_as_read', {
      conversation_id_param: conversationId,
      user_id_param: session.user.id
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in mark-read API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
