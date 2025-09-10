import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingIndicatorProps {
  typingUsers: Array<{
    userId: string;
    userName: string;
  }>;
}

export const TypingIndicator = React.memo(function TypingIndicator({ 
  typingUsers 
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-6 w-6 border-2 border-white">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="text-xs">
              {user.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span>
          {typingUsers.length === 1
            ? `${typingUsers[0].userName} écrit`
            : typingUsers.length === 2
            ? `${typingUsers[0].userName} et ${typingUsers[1].userName} écrivent`
            : `${typingUsers[0].userName} et ${typingUsers.length - 1} autres écrivent`
          }
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
});
