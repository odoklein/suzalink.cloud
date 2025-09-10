import React, { useState, useRef, useEffect } from 'react';
import { Pin, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Message } from '@/app/types/messagerie';

interface MessageContextMenuProps {
  message: Message;
  currentUserId: string;
  onPinMessage: (messageId: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onClose: () => void;
  position: { x: number; y: number };
}

export const MessageContextMenu = React.memo(function MessageContextMenu({
  message,
  currentUserId,
  onPinMessage,
  onDeleteMessage,
  onClose,
  position
}: MessageContextMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    // Add a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('scroll', handleScroll, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const handlePinMessage = async () => {
    try {
      setIsLoading(true);
      await onPinMessage(message.id);
      onClose();
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Erreur lors de l\'épinglage du message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?');
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await onDeleteMessage(message.id);
      onClose();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression du message');
    } finally {
      setIsLoading(false);
    }
  };

  const canModifyMessage = message.sender_id === currentUserId;

  // Calculate position to keep menu within viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = position.x;
      let y = position.y;
      
      // Adjust horizontal position if menu would go off screen
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      
      // Adjust vertical position if menu would go off screen
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }
      
      setAdjustedPosition({ x, y });
    }
  }, [position]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
        Actions du message
      </div>
      
      <div className="py-1">
        <button
          onClick={handlePinMessage}
          disabled={isLoading}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Pin className="w-4 h-4" />
          {message.is_pinned ? 'Désépingler' : 'Épingler'}
        </button>
        
        {canModifyMessage && (
          <button
            onClick={handleDeleteMessage}
            disabled={isLoading}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
});
