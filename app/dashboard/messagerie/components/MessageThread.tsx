import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, Phone, Video, MoreHorizontal, Users, X, FileText, ImageIcon, File, Pin, AlertCircle } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { EmojiPicker } from './EmojiPicker';
import { MessageContextMenu } from './MessageContextMenu';
import { TypingIndicator } from './TypingIndicator';
import { ReadReceipt } from './ReadReceipt';
import { MessagerieAPI } from '../lib/messagerie-api';
import { toast } from 'sonner';
import type { Conversation, Message } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';

interface MessageThreadProps {
  conversation: Conversation | null;
  selectedUser: UserProfile | null;
  messages: Message[];
  onSendMessage: (content: string, attachments?: any[]) => void;
  currentUserId: string;
  sending?: boolean;
  onToggleInfo?: () => void;
  onMessageUpdate?: (updatedMessage: Message) => void;
  onMessageDelete?: (messageId: string) => void;
  onTypingStart?: (conversationId: string, userName: string) => void;
  onTypingStop?: (conversationId: string) => void;
  typingUsers?: Array<{ userId: string; userName: string }>;
  error?: string | null;
  retry?: () => void;
}

export const MessageThread = React.memo(function MessageThread({
  conversation,
  selectedUser,
  messages,
  onSendMessage,
  currentUserId,
  sending = false,
  onToggleInfo,
  onMessageUpdate,
  onMessageDelete,
  onTypingStart,
  onTypingStop,
  typingUsers = [],
  error,
  retry
}: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    message: Message;
    position: { x: number; y: number };
  } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to get the other participant in a direct conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation.participants || conversation.type !== 'direct') return null;
    return conversation.participants.find(p => p.id !== currentUserId) || null;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when conversation is viewed
  useEffect(() => {
    if (conversation?.id) {
      MessagerieAPI.markConversationAsRead(conversation.id).catch(error => {
        console.error('Error marking messages as read:', error);
      });
    }
  }, [conversation?.id]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    
    // Stop typing indicator
    if (conversation && onTypingStop) {
      onTypingStop(conversation.id);
    }
    
    onSendMessage(newMessage, pendingFiles);
    setNewMessage('');
    setPendingFiles([]);
  };

  const handleFileUploaded = (attachment: any) => {
    setPendingFiles(prev => [...prev, attachment]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!conversation || !onTypingStart) return;
    
    const currentUser = conversation.participants?.find(p => p.id === currentUserId);
    if (!currentUser) return;
    
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart(conversation.id, currentUser.full_name);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTypingStop) {
        onTypingStop(conversation.id);
      }
    }, 3000);
  }, [conversation, currentUserId, isTyping, onTypingStart, onTypingStop]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleMessageRightClick = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      message,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      const response = await MessagerieAPI.pinMessage(messageId);
      onMessageUpdate?.(response.message);
      toast.success('Message épinglé');
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Erreur lors de l\'épinglage du message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await MessagerieAPI.deleteMessage(messageId);
      onMessageDelete?.(messageId);
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression du message');
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
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

  if (!conversation && !selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sélectionnez une conversation
          </h3>
          <p className="text-gray-500">
            Choisissez une conversation existante ou démarrez-en une nouvelle
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {conversation ? (
              <>
                {conversation.type === 'group' ? (
                  <div className="relative">
                    <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="h-6 w-6 bg-white rounded-sm flex items-center justify-center">
                        <div className="h-3 w-3 bg-green-500 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getOtherParticipant(conversation)?.profile_picture_url || "/placeholder.svg"} />
                      <AvatarFallback>
                        {getOtherParticipant(conversation)?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {conversation.type === 'direct'
                      ? getOtherParticipant(conversation)?.full_name || 'Unknown User'
                      : conversation.title
                    }
                  </h2>
                  <p className="text-sm text-gray-500">
                    {conversation.type === 'group'
                      ? `${conversation.participants.length} Membre, 4 En ligne`
                      : 'Message direct'
                    }
                  </p>
                </div>
              </>
            ) : selectedUser ? (
              <>
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.profile_picture_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedUser.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedUser.full_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Nouvelle conversation
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleInfo}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="text-center">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Aujourd'hui</span>
        </div>

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              {selectedUser && !conversation ? (
                <>
                  <p className="text-lg font-medium mb-2">Démarrer la conversation avec {selectedUser.full_name}</p>
                  <p className="text-sm">Envoyez votre premier message pour commencer</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">Pas encore de messages</p>
                  <p className="text-sm">Démarrez la conversation en envoyant un message</p>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.sender_id === currentUserId ? "justify-end" : ""}`}>
              {message.sender_id !== currentUserId && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender?.profile_picture_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {message.sender?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-xs lg:max-w-md ${message.sender_id === currentUserId ? "order-first" : ""}`}>
                {message.sender_id !== currentUserId && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{message.sender?.full_name || 'Utilisateur'}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.sent_at)}</span>
                    {message.is_pinned && (
                      <Pin className="w-3 h-3 text-yellow-500" />
                    )}
                  </div>
                )}
                <div
                  className={`rounded-lg p-3 max-w-full cursor-context-menu relative ${message.sender_id === currentUserId ? "bg-green-500 text-white" : "bg-gray-100 text-gray-900"}`}
                  onContextMenu={(e) => handleMessageRightClick(e, message)}
                >
                  {message.is_pinned && message.sender_id === currentUserId && (
                    <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-300" />
                  )}
                  <p className="text-sm break-words">{message.content}</p>
                  
                  {/* Show attachments if any */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-white bg-opacity-20 rounded">
                          {getFileIcon(attachment.content_type)}
                          <span className="text-xs truncate">{attachment.filename}</span>
                          <a 
                            href={attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs underline hover:no-underline"
                          >
                            Voir
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.sender_id === currentUserId && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <div className="text-xs text-gray-500">{formatTime(message.sent_at)}</div>
                    {message.is_pinned && (
                      <Pin className="w-3 h-3 text-yellow-500" />
                    )}
                  </div>
                )}
                {/* Read receipt for own messages */}
                {message.sender_id === currentUserId && conversation && (
                  <ReadReceipt 
                    message={message} 
                    currentUserId={currentUserId}
                    conversationParticipants={conversation.participants}
                  />
                )}
              </div>
              {message.sender_id === currentUserId && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        <TypingIndicator typingUsers={typingUsers} />
        
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border-t border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            {retry && (
              <Button variant="outline" size="sm" onClick={retry} className="ml-auto">
                Réessayer
              </Button>
            )}
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200">
        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Fichiers à envoyer :</span>
              <span className="text-xs text-gray-500">({pendingFiles.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 max-w-xs"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.content_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePendingFile(index)}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            {(conversation || selectedUser) && (
              <FileUpload
                conversationId={conversation?.id || 'temp'}
                onFileUploaded={handleFileUploaded}
                disabled={sending}
              />
            )}
            <div className="flex-1 relative">
              <Input
                placeholder={
                  selectedUser && !conversation
                    ? `Tapez un message à ${selectedUser.full_name}...`
                    : "Tapez un message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                }
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <Button 
                  size="sm" 
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending}
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          currentUserId={currentUserId}
          onPinMessage={handlePinMessage}
          onDeleteMessage={handleDeleteMessage}
          onClose={closeContextMenu}
          position={contextMenu.position}
        />
      )}
    </div>
  );
});
