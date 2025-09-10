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

    // Fetch message to check access
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !message) {
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

    // Toggle pin status
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({ 
        is_pinned: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*)
      `)
      .single();

    if (error) {
      console.error('Error pinning message:', error);
      return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error in message pin POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Fetch message to check access
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !message) {
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

    // Unpin message
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({ 
        is_pinned: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*)
      `)
      .single();

    if (error) {
      console.error('Error unpinning message:', error);
      return NextResponse.json({ error: 'Failed to unpin message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error in message unpin DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
