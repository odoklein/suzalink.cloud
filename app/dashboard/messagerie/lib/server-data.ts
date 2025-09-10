// Server-side data fetching for SSR/SSG
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { auth } from '@/auth';
import type { Conversation, UserProfile } from '@/app/types/messagerie';

export async function getServerConversations(): Promise<Conversation[]> {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const supabase = await createServerSupabaseClient();

    // First get conversation IDs where user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', session.user.id);

    if (participantError || !participantData) {
      return [];
    }

    const conversationIds = participantData.map(p => p.conversation_id);

    if (conversationIds.length === 0) {
      return [];
    }

    // Get conversations with participants
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(
          user:users(id, full_name, email, profile_picture_url)
        ),
        creator:users!conversations_created_by_fkey(id, full_name, email, profile_picture_url)
      `)
      .in('id', conversationIds)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching server conversations:', error);
      return [];
    }

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations?.map(async (conv: any) => {
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
          last_message: lastMessage || null
        };
      }) || []
    );

    // Flatten participants structure to match frontend expectations
    const flattenedConversations = conversationsWithLastMessage?.map((conv: any) => ({
      ...conv,
      participants: conv.participants?.map((p: any) => ({
        id: p.user.id,
        full_name: p.user.full_name,
        email: p.user.email,
        profile_picture_url: p.user.profile_picture_url
      })) || []
    })) || [];

    return flattenedConversations;
  } catch (error) {
    console.error('Error in getServerConversations:', error);
    return [];
  }
}

export async function getServerUsers(): Promise<UserProfile[]> {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const supabase = await createServerSupabaseClient();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, profile_picture_url, created_at')
      .order('full_name')
      .limit(100);

    if (error) {
      console.error('Error fetching server users:', error);
      return [];
    }

    return users || [];
  } catch (error) {
    console.error('Error in getServerUsers:', error);
    return [];
  }
}

export async function getServerMessages(conversationId: string): Promise<any[]> {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is a participant
    const { data: participantCheck } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', session.user.id)
      .single();

    if (!participantCheck) {
      return [];
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, full_name, email, profile_picture_url),
        attachments:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('is_pinned', { ascending: false })
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching server messages:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Error in getServerMessages:', error);
    return [];
  }
}
