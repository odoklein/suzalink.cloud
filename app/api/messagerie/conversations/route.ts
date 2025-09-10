import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type { CreateConversationForm, ConversationsResponse } from '@/app/types/messagerie';

export async function GET(request: NextRequest) {
  try {
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeArchived = searchParams.get('include_archived') === 'true';

    // First get conversation IDs where user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', session.user.id);

    if (participantError) {
      console.error('Error fetching participant conversations:', participantError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    const conversationIds = participantData?.map(p => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get conversations with participants and last message
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:users(id, full_name, email, profile_picture_url)
        )
      `)
      .in('id', conversationIds)
      .eq('is_archived', includeArchived)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }


    // Calculate unread counts and get last message for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations?.map(async (conv) => {
        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', conv.id)
          .not('message_reads', 'cs', `{"user_id":"${session.user.id}"}`);

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            message_type,
            sent_at,
            sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url)
          `)
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          unread_count: count || 0,
          last_message: lastMessage || null
        };
      }) || []
    );

    // Get total count
    const { count: total } = await supabase
      .from('conversation_participants')
      .select('conversation_id', { count: 'exact' })
      .eq('user_id', session.user.id);

    const unreadTotal = conversationsWithUnread.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

    // Flatten participants structure to match frontend expectations
    const flattenedConversations = conversationsWithUnread.map((conv: any) => ({
      ...conv,
      participants: conv.participants?.map((p: any) => ({
        id: p.user.id,
        full_name: p.user.full_name,
        email: p.user.email,
        profile_picture_url: p.user.profile_picture_url
      })) || []
    }));

    const response: ConversationsResponse = {
      conversations: flattenedConversations || [],
      total: total || 0,
      unread_total: unreadTotal
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in conversations GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current session using NextAuth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const body: CreateConversationForm = await request.json();

    // Validate participants
    if (!body.participant_ids || body.participant_ids.length === 0) {
      return NextResponse.json({ error: 'At least one participant required' }, { status: 400 });
    }

    // For direct messages, ensure only 1 other participant and check if conversation already exists
    if (body.type === 'direct') {
      if (body.participant_ids.length !== 1) {
        return NextResponse.json({ error: 'Direct messages must have exactly 1 other participant' }, { status: 400 });
      }

      // Check if direct conversation already exists between these users
      const participants = [session.user.id, ...body.participant_ids].sort();

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          participants:conversation_participants(user_id)
        `)
        .eq('type', 'direct')
        .eq('is_archived', false);

      const existingDirect = existingConversation?.find(conv => {
        const convParticipants = conv.participants.map((p: any) => p.user_id).sort();
        return JSON.stringify(convParticipants) === JSON.stringify(participants);
      });

      if (existingDirect) {
        // Update title if it's missing
        if (!existingDirect.title) {
          const { data: otherUser } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', body.participant_ids[0])
            .single();
          
          if (otherUser) {
            const newTitle = otherUser.full_name || otherUser.email || 'Unknown User';
            await supabase
              .from('conversations')
              .update({ title: newTitle })
              .eq('id', existingDirect.id);
          }
        }

        // Fetch the complete conversation with all details
        const { data: completeConversation, error: fetchError } = await supabase
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
          .eq('id', existingDirect.id)
          .single();

        if (fetchError) {
          console.error('Error fetching complete conversation:', fetchError);
          return NextResponse.json({ error: 'Failed to fetch conversation details' }, { status: 500 });
        }

        return NextResponse.json({ conversation: completeConversation }, { status: 200 });
      }
    }

    // For direct messages, get the other person's name for the title
    let conversationTitle = body.title;
    if (body.type === 'direct' && !conversationTitle) {
      const { data: otherUser } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', body.participant_ids[0])
        .single();
      
      if (otherUser) {
        conversationTitle = otherUser.full_name || otherUser.email || 'Unknown User';
      }
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: conversationTitle || null,
        type: body.type,
        created_by: session.user.id
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add participants including creator
    const allParticipantIds = Array.from(new Set([session.user.id, ...body.participant_ids]));

    const participantsData = allParticipantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert(participantsData);

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Clean up conversation if participants failed
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // Fetch complete conversation with participants
    const { data: completeConversation, error: fetchError } = await supabase
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
      .eq('id', conversation.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete conversation:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }

    // Flatten participants structure to match frontend expectations
    if (completeConversation.participants) {
      completeConversation.participants = completeConversation.participants.map((p: any) => ({
        id: p.user.id,
        full_name: p.user.full_name,
        email: p.user.email,
        profile_picture_url: p.user.profile_picture_url
      }));
    }

    return NextResponse.json({ conversation: completeConversation }, { status: 201 });
  } catch (error) {
    console.error('Error in conversations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
