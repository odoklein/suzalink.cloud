import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type { CreateMessageForm, MessagesResponse } from '@/app/types/messagerie';

export async function GET(
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
    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor'); // For pagination

    // Check if user is a participant of this conversation
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Build query for messages
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*),
        read_by:message_reads(
          user_id,
          read_at,
          user:users!message_reads_user_id_fkey(id, full_name, profile_picture_url)
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('sent_at', { ascending: false })
      .limit(limit);

    // Apply cursor-based pagination if provided
    if (cursor) {
      query = query.lt('sent_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Reverse to show oldest first (we fetched newest first for cursor pagination)
    const reversedMessages = messages?.reverse() || [];

    // Mark messages as read for current user
    const unreadMessageIds = reversedMessages
      .filter(msg => !msg.read_by?.some((read: any) => read.user_id === session.user.id))
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      const readData = unreadMessageIds.map(messageId => ({
        message_id: messageId,
        user_id: session.user.id
      }));

      await supabase
        .from('message_reads')
        .upsert(readData, { onConflict: 'message_id,user_id' });
    }

    // Check if there are more messages
    const { count: totalCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false);

    const hasMore = (totalCount || 0) > (cursor ? reversedMessages.length + parseInt(cursor.split(',').length.toString()) : reversedMessages.length);
    const nextCursor = hasMore && reversedMessages.length > 0 ? reversedMessages[0].sent_at : undefined;

    const response: MessagesResponse = {
      messages: reversedMessages,
      total: totalCount || 0,
      has_more: hasMore,
      next_cursor: nextCursor
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body: CreateMessageForm = await request.json();
    const { id: conversationId } = await params;

    // Verify conversation exists and user is participant
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Validate message content
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (body.content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: body.content.trim(),
        message_type: body.message_type || 'text'
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url)
      `)
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Handle file attachments if provided
    let attachments: any[] = [];
    if (body.attachments && body.attachments.length > 0) {
      // Update attachments with the message ID
      const { data: updatedAttachments, error: attachmentError } = await supabase
        .from('message_attachments')
        .update({ message_id: message.id })
        .in('id', body.attachments)
        .eq('uploaded_by', session.user.id)
        .select();

      if (attachmentError) {
        console.error('Error updating attachments:', attachmentError);
        // Don't fail the message creation for attachment errors
      } else {
        attachments = updatedAttachments || [];
      }
    }

    return NextResponse.json({
      message: {
        ...message,
        attachments
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
