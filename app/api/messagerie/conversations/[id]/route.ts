import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type { UpdateConversationForm } from '@/app/types/messagerie';

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

    // Fetch conversation with participants and last message
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:users(id, full_name, email, profile_picture_url)
        ),
        creator:users!conversations_created_by_fkey(id, full_name, email, profile_picture_url),
        last_message:messages(
          id,
          content,
          message_type,
          sent_at,
          sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      console.error('Error fetching conversation:', error);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Flatten participants structure to match frontend expectations
    const flattenedConversation = {
      ...conversation,
      participants: conversation.participants?.map((p: any) => ({
        id: p.user.id,
        full_name: p.user.full_name,
        email: p.user.email,
        profile_picture_url: p.user.profile_picture_url
      })) || []
    };

    return NextResponse.json({ conversation: flattenedConversation });
  } catch (error) {
    console.error('Error in conversation GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
    const body: UpdateConversationForm = await request.json();
    const { id: conversationId } = await params;

    // Check if user is a participant (for group chats) or creator
    const { data: participantCheck, error: participantError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (participantError || !participantCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update conversation
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;
    updateData.updated_at = new Date().toISOString();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select(`
        *,
        participants:conversation_participants(
          user:users(id, full_name, email, profile_picture_url)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in conversation PUT:', error);
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
    const { id: conversationId } = await params;

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

    // Get conversation details to check type and creator
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('type, created_by')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // For group conversations, only creator can delete
    // For direct conversations, any participant can delete
    if (conversation.type === 'group' && conversation.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Only conversation creator can delete group conversations' }, { status: 403 });
    }

    // Soft delete by archiving (we don't actually delete for data integrity)
    const { error } = await supabase
      .from('conversations')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error archiving conversation:', error);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Conversation archived successfully' });
  } catch (error) {
    console.error('Error in conversation DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
