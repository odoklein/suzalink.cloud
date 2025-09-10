import React from 'react';
import { Message } from '@/app/types/messagerie';
import { formatMessageTime } from '../lib/messagerie-api';

interface ReadReceiptProps {
  message: Message;
  currentUserId: string;
  conversationParticipants: Array<{ id: string; full_name: string; profile_picture_url?: string }>;
}

export const ReadReceipt: React.FC<ReadReceiptProps> = ({ 
  message, 
  currentUserId, 
  conversationParticipants 
}) => {
  // Don't show read receipts for own messages
  if (message.sender_id === currentUserId) {
    return null;
  }

  // Get other participants (excluding current user)
  const otherParticipants = conversationParticipants.filter(p => p.id !== currentUserId);
  
  if (otherParticipants.length === 0) {
    return null;
  }

  // Get read status for this message
  const readBy = message.read_by || [];
  const readByOtherUsers = readBy.filter(read => read.user_id !== currentUserId);
  
  // Check if all other participants have read the message
  const allRead = otherParticipants.every(participant => 
    readByOtherUsers.some(read => read.user_id === participant.id)
  );

  // Get the last read timestamp
  const lastReadAt = readByOtherUsers.length > 0 
    ? readByOtherUsers.sort((a, b) => new Date(b.read_at).getTime() - new Date(a.read_at).getTime())[0].read_at
    : null;

  if (otherParticipants.length === 1) {
    // Direct message - show single read receipt
    const otherUser = otherParticipants[0];
    const isRead = readByOtherUsers.some(read => read.user_id === otherUser.id);
    
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
        {isRead ? (
          <>
            <span className="text-blue-500">✓✓</span>
            <span>Lu</span>
            {lastReadAt && (
              <span className="ml-1">
                {formatMessageTime(lastReadAt)}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">✓</span>
        )}
      </div>
    );
  } else {
    // Group message - show read count
    const readCount = readByOtherUsers.length;
    const totalOthers = otherParticipants.length;
    
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
        {allRead ? (
          <>
            <span className="text-blue-500">✓✓</span>
            <span>Lu par tous ({totalOthers})</span>
            {lastReadAt && (
              <span className="ml-1">
                {formatMessageTime(lastReadAt)}
              </span>
            )}
          </>
        ) : readCount > 0 ? (
          <>
            <span className="text-blue-500">✓</span>
            <span>Lu par {readCount}/{totalOthers}</span>
          </>
        ) : (
          <span className="text-gray-400">✓</span>
        )}
      </div>
    );
  }
};
