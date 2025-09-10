import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Users, Search, Plus, MessageCircle, MoreVertical, Edit, Trash2, UserPlus, Archive, Edit3 } from 'lucide-react';
import { SearchResults } from './SearchResults';
import type { Conversation, Message } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';

interface ConversationListProps {
  conversations: Conversation[];
  users: UserProfile[];
  selectedConversation: Conversation | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onConversationSelect: (conversation: Conversation) => void;
  onUserSelect: (user: UserProfile) => void;
  onNewConversation: () => void;
  onEditConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onAddParticipants: (conversation: Conversation) => void;
  onMessageSelect?: (message: Message) => void;
  loading?: boolean;
  currentUserId: string;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export const ConversationList = React.memo(function ConversationList({
  conversations,
  users,
  selectedConversation,
  searchQuery,
  onSearchChange,
  onConversationSelect,
  onUserSelect,
  onNewConversation,
  onEditConversation,
  onDeleteConversation,
  onAddParticipants,
  onMessageSelect,
  loading = false,
  currentUserId,
  showSearch,
  onToggleSearch
}: ConversationListProps) {
  // Helper function to get the other participant in a direct conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation.participants || conversation.type !== 'direct') return null;
    return conversation.participants.find(p => p.id !== currentUserId) || null;
  };
  const formatTime = (dateString: string) => {
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

  // Filtered data is now passed from parent component

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher des conversations et utilisateurs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        )}

        {/* Online Now */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">En ligne maintenant</span>
            <span className="text-sm text-gray-400">Voir tout</span>
          </div>
          <div className="flex gap-2">
            {users.slice(0, 5).map((user, index) => (
              <div key={user.id} className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {user.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Pinned Message */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span>📌</span>
          <span>Message épinglé</span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {showSearch && searchQuery ? (
          <div className="space-y-2">
            {/* Search Results for Conversations */}
            {conversations.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Conversations
                </div>
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => onConversationSelect(conversation)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative">
                      {conversation.type === 'group' ? (
                        <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          <Users className="w-6 h-6" />
                        </div>
                      ) : (
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getOtherParticipant(conversation)?.profile_picture_url || "/placeholder.svg"} />
                          <AvatarFallback>
                            {getOtherParticipant(conversation)?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.type === 'direct'
                            ? getOtherParticipant(conversation)?.full_name || 'Unknown User'
                            : conversation.title
                          }
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.last_message?.content 
                          ? (conversation.last_message.message_type === 'file' 
                              ? `📎 ${conversation.last_message.content}` 
                              : conversation.last_message.content)
                          : 'Aucun message'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Search Results for Users */}
            {users.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  Utilisateurs
                </div>
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {user.full_name}
                        </h3>
                        <span className="text-xs text-gray-500">Nouveau</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No search results */}
            {conversations.length === 0 && users.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucun résultat trouvé</p>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Existing Conversations */}
            {conversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                  selectedConversation?.id === conversation.id ? "bg-green-50 border-r-2 border-green-500" : ""
                }`}
              >
                <div className="relative">
                  {conversation.type === 'group' ? (
                    <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      <Users className="w-6 h-6" />
                    </div>
                  ) : (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getOtherParticipant(conversation)?.profile_picture_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getOtherParticipant(conversation)?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {index === 0 && (
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.type === 'direct'
                        ? getOtherParticipant(conversation)?.full_name || 'Unknown User'
                        : conversation.title
                      }
                    </h3>
                    <span className="text-xs text-gray-500">{formatTime(conversation.updated_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.last_message?.content 
                      ? (conversation.last_message.message_type === 'file' 
                          ? `📎 ${conversation.last_message.content}` 
                          : conversation.last_message.content)
                      : 'Aucun message'
                    }
                  </p>
                </div>
                {conversation.unread_count && conversation.unread_count > 0 && (
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                )}
              </div>
            ))}

            {/* Start New Conversation Button */}
            <div
              onClick={onNewConversation}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
            >
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">
                  Démarrer une nouvelle conversation
                </h3>
                <p className="text-sm text-gray-500">
                  Créer un nouveau groupe ou message direct
                </p>
              </div>
            </div>

            {/* No conversations */}
            {conversations.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Pas encore de conversations</p>
                  <p className="text-sm">Démarrez une nouvelle conversation pour commencer</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
