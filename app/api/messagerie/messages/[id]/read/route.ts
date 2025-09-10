import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { id: messageId } = await params;

    // Verify message exists and user has access to it
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is a participant of the conversation
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Mark message as read
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        message_id: messageId,
        user_id: session.user.id,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'message_id,user_id'
      });

    if (error) {
      console.error('Error marking message as read:', error);
      return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error in message read POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
