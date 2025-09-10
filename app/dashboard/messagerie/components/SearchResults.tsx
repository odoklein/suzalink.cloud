import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, User, Clock } from 'lucide-react';
import type { Conversation, Message } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';

interface SearchResultsProps {
  query: string;
  onConversationSelect: (conversation: Conversation) => void;
  onUserSelect: (user: UserProfile) => void;
  onMessageSelect: (message: Message) => void;
}

interface SearchData {
  conversations: Conversation[];
  messages: Message[];
  users: UserProfile[];
}

export const SearchResults = React.memo(function SearchResults({
  query,
  onConversationSelect,
  onUserSelect,
  onMessageSelect
}: SearchResultsProps) {
  const [results, setResults] = useState<SearchData>({
    conversations: [],
    messages: [],
    users: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ conversations: [], messages: [], users: [] });
      return;
    }

    const searchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/messagerie/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMessages, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Recherche...</p>
      </div>
    );
  }

  if (!query || query.trim().length < 2) {
    return null;
  }

  const hasResults = results.conversations.length > 0 || results.messages.length > 0 || results.users.length > 0;

  if (!hasResults) {
    return (
      <div className="p-4 text-center text-gray-500">
        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Aucun résultat trouvé pour "{query}"</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      {/* Conversations */}
      {results.conversations.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Conversations ({results.conversations.length})
            </span>
          </div>
          {results.conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            >
              {conversation.type === 'group' ? (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  <Users className="w-4 h-4" />
                </div>
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={conversation.participants[0]?.profile_picture_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {conversation.participants[0]?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conversation.type === 'direct'
                    ? conversation.participants[0]?.full_name
                    : conversation.title
                  }
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {conversation.last_message?.content || 'Aucun message'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {results.messages.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Messages ({results.messages.length})
            </span>
          </div>
          {results.messages.slice(0, 5).map((message) => (
            <div
              key={message.id}
              onClick={() => onMessageSelect(message)}
              className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={message.sender?.profile_picture_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {message.sender?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-900">
                    {message.sender?.full_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.sent_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {message.content}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  dans {message.conversation?.title || 'Conversation'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {results.users.length > 0 && (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Utilisateurs ({results.users.length})
            </span>
          </div>
          {results.users.map((user) => (
            <div
              key={user.id}
              onClick={() => onUserSelect(user)}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                <AvatarFallback>
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
