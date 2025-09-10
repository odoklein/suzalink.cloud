"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConversationList } from './components/ConversationList';
import { MessageThread } from './components/MessageThread';
import { ConversationInfo } from './components/ConversationInfo';
import { NewConversationModal } from './components/NewConversationModal';
import { EditConversationModal } from './components/EditConversationModal';
import { AddParticipantsModal } from './components/AddParticipantsModal';
import { MessagerieAPI } from './lib/messagerie-api';
import { messageCache } from './lib/cache';
import { canCreateDirectConversation } from './lib/duplicate-prevention';
import { useRealtimeMessagerie } from './hooks/useRealtimeMessagerie';
import { useNextAuth } from '@/lib/nextauth-context';
import { toast } from 'sonner';
import type { Conversation, Message } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';

interface MessagerieClientProps {
  initialConversations: Conversation[];
  initialUsers: UserProfile[];
}

export default function MessagerieClient({ 
  initialConversations, 
  initialUsers 
}: MessagerieClientProps) {
  const { user } = useNextAuth();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showEditConversationModal, setShowEditConversationModal] = useState(false);
  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [selectedConversationForEdit, setSelectedConversationForEdit] = useState<Conversation | null>(null);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time message handlers
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    
    // Update conversation's last message
    setConversations(prev => prev.map(conv => 
      conv.id === message.conversation_id 
        ? { ...conv, last_message: message, updated_at: message.sent_at }
        : conv
    ));
  }, []);

  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages(prev => prev.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    ));
  }, []);

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  const handleMessageRead = useCallback((messageId: string, userId: string, readAt: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingRead = msg.read_by || [];
        const updatedReadBy = existingRead.some(read => read.user_id === userId)
          ? existingRead.map(read => read.user_id === userId ? { ...read, read_at: readAt } : read)
          : [...existingRead, { user_id: userId, read_at: readAt }];
        
        return { ...msg, read_by: updatedReadBy };
      }
      return msg;
    }));
  }, []);

  const handleConversationUpdate = useCallback((updatedConversation: Conversation) => {
    setConversations(prev => prev.map(conv => 
      conv.id === updatedConversation.id ? updatedConversation : conv
    ));
  }, []);

  const handleTypingStart = useCallback((userId: string, userName: string) => {
    setTypingUsers(prev => {
      const exists = prev.some(u => u.userId === userId);
      if (!exists) {
        return [...prev, { userId, userName }];
      }
      return prev;
    });
  }, []);

  const handleTypingStop = useCallback((userId: string) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== userId));
  }, []);

  // Initialize real-time subscriptions
  const { sendTypingStart, sendTypingStop, updatePresence } = useRealtimeMessagerie({
    currentUserId: user?.id || '',
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onMessageDelete: handleMessageDelete,
    onConversationUpdate: handleConversationUpdate,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
    onMessageRead: handleMessageRead
  });

  // Load conversations and users on mount (with cache)
  useEffect(() => {
    // Clear cache to ensure fresh data with correct structure
    messageCache.clear();
    
    // Initialize cache with server data
    if (initialConversations.length > 0) {
      messageCache.set('conversations', { conversations: initialConversations }, 2 * 60 * 1000);
    }
    if (initialUsers.length > 0) {
      messageCache.set('users:all:true', { users: initialUsers }, 5 * 60 * 1000);
    }

    // Load fresh data in background
    loadConversations();
    loadUsers();
  }, []);

  // Update presence on mount
  useEffect(() => {
    updatePresence();
  }, [updatePresence]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await MessagerieAPI.getConversations(true);
      setConversations(response.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des conversations';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized filtered data
  const filteredConversations = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return conversations;

    const query = debouncedSearchQuery.toLowerCase();
    return conversations.filter(conv =>
      (conv.title?.toLowerCase().includes(query) || false) ||
      conv.participants.some(p => p.full_name?.toLowerCase().includes(query) || false)
    );
  }, [conversations, debouncedSearchQuery]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return users;

    const query = debouncedSearchQuery.toLowerCase();
    return users.filter(user =>
      user.id !== user?.id &&
      (user.full_name?.toLowerCase().includes(query) || false) ||
      (user.email?.toLowerCase().includes(query) || false)
    );
  }, [users, debouncedSearchQuery, user?.id]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await MessagerieAPI.getUsers(undefined, true, true);
      setUsers(response.users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      // Try cache first for instant loading
      const response = await MessagerieAPI.getMessages(conversationId, undefined, true);
      setMessages(response.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  }, []);

  const handleUserSelect = (selectedUser: UserProfile) => {
    if (!user?.id) return;

    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      conv.type === 'direct' && 
      conv.participants.some(p => p.id === selectedUser.id)
    );

    if (existingConversation) {
      // If conversation exists, select it directly
      setSelectedConversation(existingConversation);
      setSelectedUser(null);
      loadMessages(existingConversation.id);
    } else {
      // Just select the user, don't create conversation yet
      setSelectedUser(selectedUser);
      setSelectedConversation(null);
      setMessages([]);
    }
  };

  const handleSendMessage = useCallback(async (content: string, attachments?: any[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || !user?.id) return;

    try {
      setSending(true);

      let conversationId = selectedConversation?.id;

      // If no conversation exists but we have a selected user, create conversation first
      if (!conversationId && selectedUser) {
        const conversationData = {
          type: 'direct' as const,
          participant_ids: [selectedUser.id]
        };

        const conversationResponse = await MessagerieAPI.createConversation(conversationData);
        conversationId = conversationResponse.conversation.id;
        
        // Add the new conversation to the list
        setConversations(prev => [conversationResponse.conversation, ...prev]);
        
        // Update selected conversation
        setSelectedConversation(conversationResponse.conversation);
        setSelectedUser(null);
      }

      if (!conversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
      }

      const messageData = {
        conversation_id: conversationId,
        content: content.trim() || (attachments && attachments.length > 0 ? `📎 ${attachments.length} file(s)` : ''),
        message_type: (attachments && attachments.length > 0 ? 'file' : 'text'),
        attachments: attachments?.map(att => att.id) || []
      };

      // Fix: Ensure message_type is of type MessageType (not string)
      const fixedMessageData = {
        ...messageData,
        message_type: (attachments && attachments.length > 0 ? 'file' : 'text') as 'file' | 'text'
      };

      const response = await MessagerieAPI.sendMessage(conversationId, fixedMessageData);
      setMessages(prev => [...prev, response.message]);
      
      // Update conversation's last message in the conversation list
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: response.message, updated_at: response.message.sent_at }
          : conv
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  }, [user?.id, selectedConversation, selectedUser]);

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const handleEditConversation = (conversation: Conversation) => {
    setSelectedConversationForEdit(conversation);
    setShowEditConversationModal(true);
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté pour supprimer une conversation');
      return;
    }

    // Show confirmation for group conversations
    if (conversation.type === 'group') {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer la conversation "${conversation.title || 'Sans titre'}" ?`
      );
      if (!confirmed) return;
    }

    try {
      await MessagerieAPI.deleteConversation(conversation.id);

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversation.id));

      // Clear selection if it was the deleted conversation
      if (selectedConversation?.id === conversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }

      // Clear messages cache for this conversation
      messageCache.delete(`messages:${conversation.id}`);

      toast.success('Conversation supprimée avec succès');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Erreur lors de la suppression de la conversation');
    }
  };

  const handleAddParticipants = (conversation: Conversation) => {
    setSelectedConversationForEdit(conversation);
    setShowAddParticipantsModal(true);
  };

  const handleMessageSelect = (message: Message) => {
    // Navigate to the conversation containing this message
    if (message.conversation_id) {
      const conversation = conversations.find(c => c.id === message.conversation_id);
      if (conversation) {
        setSelectedConversation(conversation);
        setShowConversationInfo(false);
      }
    }
  };

  const handleConversationUpdated = (updatedConversation: Conversation) => {
    setConversations(prev =>
      prev.map(c => c.id === updatedConversation.id ? updatedConversation : c)
    );

    // Update selected conversation if it's the one being edited
    if (selectedConversation?.id === updatedConversation.id) {
      setSelectedConversation(updatedConversation);
    }

    // Update the edit modal state
    setSelectedConversationForEdit(updatedConversation);
  };

  const handleParticipantsAdded = async () => {
    // Refresh the conversation to get updated participant list
    if (selectedConversationForEdit) {
      try {
        const response = await MessagerieAPI.getConversation(selectedConversationForEdit.id);
        setConversations(prev =>
          prev.map(c => c.id === response.conversation.id ? response.conversation : c)
        );

        // Update selected conversation if it's the one being edited
        if (selectedConversation?.id === response.conversation.id) {
          setSelectedConversation(response.conversation);
        }
      } catch (error) {
        console.error('Error refreshing conversation:', error);
      }
    }
  };

  const handleConversationCreated = (newConversation?: any) => {
    if (newConversation) {
      // Add the new conversation to the UI immediately
      setConversations(prev => [newConversation, ...prev]);
      // Select the new conversation
      setSelectedConversation(newConversation);
      setSelectedUser(null);
      // Load messages for the new conversation
      loadMessages(newConversation.id);
    } else {
      // Fallback to reloading conversations
      loadConversations();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <ConversationList
        conversations={showSearch && searchQuery ? filteredConversations : conversations}
        users={showSearch && searchQuery ? filteredUsers : []}
        selectedConversation={selectedConversation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onConversationSelect={setSelectedConversation}
        onUserSelect={handleUserSelect}
        onNewConversation={handleNewConversation}
        onEditConversation={handleEditConversation}
        onDeleteConversation={handleDeleteConversation}
        onAddParticipants={handleAddParticipants}
        onMessageSelect={handleMessageSelect}
        loading={loading}
        currentUserId={user?.id || ''}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
      />

      <MessageThread
        conversation={selectedConversation}
        selectedUser={null}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserId={user?.id || ''}
        sending={sending}
        onToggleInfo={() => setShowConversationInfo(!showConversationInfo)}
        onMessageUpdate={handleMessageUpdate}
        onMessageDelete={handleMessageDelete}
        onTypingStart={sendTypingStart}
        onTypingStop={sendTypingStop}
        typingUsers={typingUsers}
        error={error}
        retry={loadConversations}
      />

      {showConversationInfo && selectedConversation && (
        <ConversationInfo
          conversation={selectedConversation}
          onClose={() => setShowConversationInfo(false)}
          onEditConversation={handleEditConversation}
          onAddParticipants={handleAddParticipants}
          onDeleteConversation={handleDeleteConversation}
        />
      )}

      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onConversationCreated={handleConversationCreated}
      />

      <EditConversationModal
        isOpen={showEditConversationModal}
        onClose={() => setShowEditConversationModal(false)}
        conversation={selectedConversationForEdit}
        onConversationUpdated={handleConversationUpdated}
      />

      <AddParticipantsModal
        isOpen={showAddParticipantsModal}
        onClose={() => setShowAddParticipantsModal(false)}
        conversation={selectedConversationForEdit}
        onParticipantsAdded={handleParticipantsAdded}
      />
    </div>
  );
}
