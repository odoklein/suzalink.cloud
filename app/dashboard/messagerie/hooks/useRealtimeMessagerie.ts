import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Conversation, Message, RealtimeMessageEvent } from '@/app/types/messagerie';

interface UseRealtimeMessagerieProps {
  currentUserId: string;
  onNewMessage: (message: Message) => void;
  onMessageUpdate: (message: Message) => void;
  onMessageDelete: (messageId: string) => void;
  onConversationUpdate: (conversation: Conversation) => void;
  onTypingStart?: (userId: string, userName: string) => void;
  onTypingStop?: (userId: string) => void;
  onMessageRead?: (messageId: string, userId: string, readAt: string) => void;
}

export function useRealtimeMessagerie({
  currentUserId,
  onNewMessage,
  onMessageUpdate,
  onMessageDelete,
  onConversationUpdate,
  onTypingStart,
  onTypingStop,
  onMessageRead
}: UseRealtimeMessagerieProps) {
  const supabase = useMemo(() => {
    return typeof window !== 'undefined' ? createClient() : null;
  }, []);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!supabase) return;
    
    // Subscribe to messages changes
    const messagesSubscription = supabase
      .channel('messagerie-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${currentUserId}` // Don't listen to own messages
        },
        (payload) => {
          const message = payload.new as Message;
          onNewMessage(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.new as Message;
          onMessageUpdate(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const message = payload.old as Message;
          onMessageDelete(message.id);
        }
      )
      .subscribe();

    // Subscribe to conversations changes
    const conversationsSubscription = supabase
      .channel('messagerie-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          const conversation = payload.new as Conversation;
          onConversationUpdate(conversation);
        }
      )
      .subscribe();

    // Subscribe to typing indicators (using a custom channel)
    const typingSubscription = supabase
      .channel('messagerie-typing')
      .on('broadcast', { event: 'typing-start' }, (payload) => {
        if (payload.user_id !== currentUserId) {
          onTypingStart?.(payload.user_id, payload.user_name);
        }
      })
      .on('broadcast', { event: 'typing-stop' }, (payload) => {
        if (payload.user_id !== currentUserId) {
          onTypingStop?.(payload.user_id);
        }
      })
      .subscribe();

    // Subscribe to message read status changes
    const messageReadsSubscription = supabase
      .channel('messagerie-message-reads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads'
        },
        (payload) => {
          const readRecord = payload.new as { message_id: string; user_id: string; read_at: string };
          onMessageRead?.(readRecord.message_id, readRecord.user_id, readRecord.read_at);
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
      typingSubscription.unsubscribe();
      messageReadsSubscription.unsubscribe();
    };
  }, [currentUserId, onNewMessage, onMessageUpdate, onMessageDelete, onConversationUpdate, onTypingStart, onTypingStop, onMessageRead, supabase]);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (!supabase) return;
    
    supabase.channel('messagerie-typing').send({
      type: 'broadcast',
      event: 'typing-stop',
      payload: {
        conversation_id: conversationId,
        user_id: currentUserId
      }
    });

    // Clear timeout
    const timeout = typingTimeoutRef.current.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutRef.current.delete(conversationId);
    }
  }, [supabase, currentUserId]);

  // Function to send typing indicator
  const sendTypingStart = useCallback((conversationId: string, userName: string) => {
    if (!supabase) return;
    
    supabase.channel('messagerie-typing').send({
      type: 'broadcast',
      event: 'typing-start',
      payload: {
        conversation_id: conversationId,
        user_id: currentUserId,
        user_name: userName
      }
    });

    // Clear existing timeout
    const existingTimeout = typingTimeoutRef.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      sendTypingStop(conversationId);
    }, 3000);

    typingTimeoutRef.current.set(conversationId, timeout);
  }, [supabase, currentUserId, sendTypingStop]);

  // Function to update user presence
  const updatePresence = useCallback(async () => {
    try {
      await fetch('/api/messagerie/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, []);

  return {
    sendTypingStart,
    sendTypingStop,
    updatePresence
  };
}
