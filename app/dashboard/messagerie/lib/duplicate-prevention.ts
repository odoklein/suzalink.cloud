// Duplicate conversation prevention utilities

import type { Conversation } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';

/**
 * Check if a direct conversation already exists between two users
 */
export function findExistingDirectConversation(
  conversations: Conversation[],
  userId1: string,
  userId2: string
): Conversation | null {
  return conversations.find(conv => {
    if (conv.type !== 'direct') return false;
    
    const participantIds = conv.participants.map(p => p.id);
    return participantIds.includes(userId1) && participantIds.includes(userId2);
  }) || null;
}

/**
 * Check if a user already has a conversation with another user
 */
export function hasDirectConversationWith(
  conversations: Conversation[],
  currentUserId: string,
  targetUserId: string
): boolean {
  return findExistingDirectConversation(conversations, currentUserId, targetUserId) !== null;
}

/**
 * Get all users that the current user has direct conversations with
 */
export function getUsersWithDirectConversations(
  conversations: Conversation[],
  currentUserId: string
): string[] {
  return conversations
    .filter(conv => conv.type === 'direct')
    .map(conv => conv.participants.find(p => p.id !== currentUserId)?.id)
    .filter(Boolean) as string[];
}

/**
 * Filter users to exclude those who already have direct conversations
 */
export function filterUsersWithoutDirectConversations(
  users: UserProfile[],
  conversations: Conversation[],
  currentUserId: string
): UserProfile[] {
  const usersWithConversations = getUsersWithDirectConversations(conversations, currentUserId);
  
  return users.filter(user => 
    user.id !== currentUserId && 
    !usersWithConversations.includes(user.id)
  );
}

/**
 * Validate that a direct conversation can be created
 */
export function canCreateDirectConversation(
  conversations: Conversation[],
  currentUserId: string,
  targetUserId: string
): { canCreate: boolean; existingConversation?: Conversation } {
  if (currentUserId === targetUserId) {
    return { canCreate: false };
  }

  const existingConversation = findExistingDirectConversation(
    conversations, 
    currentUserId, 
    targetUserId
  );

  return {
    canCreate: !existingConversation,
    existingConversation
  };
}
