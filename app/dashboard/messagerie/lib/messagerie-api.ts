import type {
  Conversation,
  Message,
  ConversationsResponse,
  MessagesResponse,
  CreateConversationForm,
  CreateMessageForm
} from '@/app/types/messagerie';
import { getCachedData, setCachedData, messageCache } from './cache';

export class MessagerieAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Conversations API
  static async getConversations(useCache = true): Promise<ConversationsResponse> {
    if (useCache) {
      const cached = getCachedData<ConversationsResponse>('conversations');
      if (cached) {
        return cached;
      }
    }

    const response = await this.request<ConversationsResponse>('/api/messagerie/conversations');
    
    if (useCache) {
      setCachedData('conversations', response, 2 * 60 * 1000); // 2 minutes cache
    }
    
    return response;
  }

  static async getConversation(id: string): Promise<{ conversation: Conversation }> {
    return this.request<{ conversation: Conversation }>(`/api/messagerie/conversations/${id}`);
  }

  static async createConversation(data: CreateConversationForm): Promise<{ conversation: Conversation }> {
    return this.request<{ conversation: Conversation }>('/api/messagerie/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateConversation(
    id: string,
    data: Partial<Conversation>
  ): Promise<{ conversation: Conversation }> {
    return this.request<{ conversation: Conversation }>(`/api/messagerie/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteConversation(id: string): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>(`/api/messagerie/conversations/${id}`, {
      method: 'DELETE',
    });
    
    // Invalidate conversations cache after deletion
    messageCache.delete('conversations');
    
    return response;
  }

  // Messages API
  static async getMessages(conversationId: string, cursor?: string, useCache = true): Promise<MessagesResponse> {
    const cacheKey = `messages:${conversationId}${cursor ? `:${cursor}` : ''}`;
    
    if (useCache && !cursor) { // Only cache first page
      const cached = getCachedData<MessagesResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);

    const response = await this.request<MessagesResponse>(
      `/api/messagerie/conversations/${conversationId}/messages?${params.toString()}`
    );
    
    if (useCache && !cursor) { // Only cache first page
      setCachedData(cacheKey, response, 1 * 60 * 1000); // 1 minute cache for messages
    }
    
    return response;
  }

  static async sendMessage(conversationId: string, data: CreateMessageForm): Promise<{ message: Message }> {
    const response = await this.request<{ message: Message }>(
      `/api/messagerie/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    // Invalidate message cache for this conversation
    messageCache.delete(`messages:${conversationId}`);
    
    return response;
  }

  static async markMessageAsRead(messageId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/messagerie/messages/${messageId}/read`, {
      method: 'POST',
    });
  }

  static async pinMessage(messageId: string): Promise<{ message: Message }> {
    return this.request<{ message: Message }>(`/api/messagerie/messages/${messageId}/pin`, {
      method: 'POST',
    });
  }

  static async unpinMessage(messageId: string): Promise<{ message: Message }> {
    return this.request<{ message: Message }>(`/api/messagerie/messages/${messageId}/pin`, {
      method: 'DELETE',
    });
  }

  static async deleteMessage(messageId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/messagerie/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Users API
  static async getUsers(query?: string, excludeCurrent = true, useCache = true): Promise<{ users: any[] }> {
    const cacheKey = `users:${query || 'all'}:${excludeCurrent}`;
    
    if (useCache && !query) { // Only cache when no search query
      const cached = getCachedData<{ users: any[] }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (!excludeCurrent) params.set('exclude_current', 'false');

    const response = await this.request<{ users: any[] }>(`/api/messagerie/users?${params.toString()}`);
    
    if (useCache && !query) { // Only cache when no search query
      setCachedData(cacheKey, response, 5 * 60 * 1000); // 5 minutes cache for users
    }
    
    return response;
  }

  // Participants API
  static async getParticipants(conversationId: string): Promise<{ participants: any[] }> {
    return this.request<{ participants: any[] }>(`/api/messagerie/conversations/${conversationId}/participants`);
  }

  static async addParticipants(conversationId: string, userIds: string[]): Promise<{ message: string; added_users: number }> {
    return this.request<{ message: string; added_users: number }>(
      `/api/messagerie/conversations/${conversationId}/participants`,
      {
        method: 'POST',
        body: JSON.stringify({ user_ids: userIds }),
      }
    );
  }

  static async removeParticipant(conversationId: string, userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/messagerie/conversations/${conversationId}/participants?user_id=${userId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Mark messages as read
  static async markConversationAsRead(conversationId: string): Promise<void> {
    return this.request<void>(
      `/api/messagerie/conversations/${conversationId}/mark-read`,
      {
        method: 'POST',
      }
    );
  }

  // Get read status for a message
  static async getMessageReadStatus(messageId: string): Promise<{ readStatus: any[] }> {
    return this.request<{ readStatus: any[] }>(`/api/messagerie/messages/${messageId}/read-status`);
  }
}

// Utility functions
export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInHours < 168) { // 7 days
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export const formatConversationTime = (dateString: string): string => {
  return formatMessageTime(dateString);
};
