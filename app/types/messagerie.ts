// Messagerie (Messaging) types and interfaces for internal team communication

export type ConversationType = 'direct' | 'group';
export type MessageType = 'text' | 'file' | 'image';

export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  participants: UserProfile[];
  last_message?: Message;
  unread_count?: number;

  // Populated relationships
  creator?: {
    id: string;
    full_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  sent_at: string;
  edited_at?: string;
  is_deleted: boolean;
  is_pinned?: boolean;
  attachments?: MessageAttachment[];

  // Populated relationships
  sender?: {
    id: string;
    full_name: string;
    email: string;
    profile_picture_url?: string;
  };

  // Read status
  read_by?: Array<{
    user_id: string;
    read_at: string;
    user?: {
      id: string;
      full_name: string;
      profile_picture_url?: string;
    };
  }>;

  // UI helpers
  is_read?: boolean;
  is_own?: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;

  // Populated relationship
  user?: {
    id: string;
    full_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

export interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

// Form types for creating/updating entities
export interface CreateConversationForm {
  title?: string; // Optional for direct messages
  type: ConversationType;
  participant_ids: string[]; // User IDs to add to conversation
}

export interface UpdateConversationForm {
  id: string;
  title?: string;
  is_archived?: boolean;
}

export interface CreateMessageForm {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
  attachments?: File[];
}

export interface UpdateMessageForm {
  id: string;
  content: string;
}

// API response types
export interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  unread_total: number;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
  next_cursor?: string;
}

// Real-time event types
export interface RealtimeMessageEvent {
  type: 'new_message' | 'message_updated' | 'message_deleted' | 'conversation_updated';
  conversation_id: string;
  message?: Message;
  conversation?: Conversation;
  timestamp: string;
}

// Search and filtering
export interface MessageSearchFilters {
  conversation_id?: string;
  query?: string;
  sender_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// User presence for real-time features
export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
  current_conversation_id?: string;
}

// Typing indicators
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  timestamp: string;
}

// File upload types
export interface FileUploadResult {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  content_type: string;
}

// Error types
export interface MessagerieError {
  code: string;
  message: string;
  details?: any;
}

// Notification types
export interface MessageNotification {
  id: string;
  conversation_id: string;
  message_id: string;
  sender_name: string;
  content_preview: string;
  timestamp: string;
  conversation_title: string;
}

// Import existing UserProfile type
import type { UserProfile } from './user';
