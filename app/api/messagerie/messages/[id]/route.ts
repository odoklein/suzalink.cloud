import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type { UpdateMessageForm } from '@/app/types/messagerie';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: messageId } = await params;

    // Fetch message with sender and attachments
    const { data: message, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*),
        read_by:message_reads(user_id)
      `)
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (error || !message) {
      console.error('Error fetching message:', error);
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

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in message GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateMessageForm = await request.json();
    const { id: messageId } = await params;

    // Fetch message to check ownership
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only sender can edit their own messages
    if (message.sender_id !== session.user.id) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 });
    }

    // Validate content
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (body.content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    // Update message
    const { data: updatedMessage, error } = await supabase
      .from('messages')
      .update({
        content: body.content.trim(),
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*)
      `)
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error('Error in message PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user from Supabase auth
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: messageId } = await params;

    // Fetch message to check ownership
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is the sender or an admin/manager
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const canDelete = message.sender_id === session.user.id ||
                     userProfile?.role === 'admin' ||
                     userProfile?.role === 'manager';

    if (!canDelete) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    // Soft delete message
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error in message DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
