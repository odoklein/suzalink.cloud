import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, FileText, ImageIcon, Download, Users, Settings, UserPlus, Trash2 } from 'lucide-react';
import type { Conversation } from '@/app/types/messagerie';

interface ConversationInfoProps {
  conversation: Conversation | null;
  onClose: () => void;
  onEditConversation?: (conversation: Conversation) => void;
  onAddParticipants?: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
}

export const ConversationInfo = React.memo(function ConversationInfo({
  conversation,
  onClose,
  onEditConversation,
  onAddParticipants,
  onDeleteConversation
}: ConversationInfoProps) {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  if (!conversation) {
    return null;
  }

  const files = [
    { name: "Preview shot webinar.ai", size: "2.4 MB • 2 minutes ago", type: "ai", icon: FileText },
    { name: "Mountain shot travel.png", size: "", type: "png", icon: ImageIcon },
    { name: "Ramadhan vibes.mp4", size: "10.4 • 24th Apr 2024", type: "mp4", icon: FileText },
  ];

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Informations du groupe</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Group Details */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-center mb-4">
          {conversation.type === 'group' ? (
            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="h-10 w-10 bg-white rounded-sm flex items-center justify-center">
                <div className="h-6 w-6 bg-green-500 rounded-sm"></div>
              </div>
            </div>
          ) : (
            <Avatar className="h-16 w-16 mx-auto mb-2">
              <AvatarImage src={conversation.participants[0]?.profile_picture_url || "/placeholder.svg"} />
              <AvatarFallback>
                {conversation.participants[0]?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
          <h3 className="font-semibold text-gray-900">
            {conversation.type === 'direct'
              ? conversation.participants[0]?.full_name
              : conversation.title
            }
          </h3>
          <p className="text-sm text-gray-500">
            {conversation.type === 'group'
              ? `${conversation.participants.length} Membre`
              : 'Message direct'
            }
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">📝 Description</span>
            <p className="text-sm text-gray-700 mt-1">
              {conversation.type === 'group'
                ? "Une agence digitale qui a le fantastique pour créer des travaux fantastiques pour tous les clients et utilisateurs. Nous venons d'une petite ville, mais nous avons de grands rêves."
                : "Conversation par message direct"
              }
            </p>
            <p className="text-sm text-green-500 mt-1">@{conversation.title?.toLowerCase().replace(/\s+/g, '') || 'team'}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">🔔 Notification</span>
            <Switch 
              checked={notificationsEnabled} 
              onCheckedChange={setNotificationsEnabled}
              className="data-[state=checked]:bg-green-500" 
            />
          </div>

          {/* Action Buttons */}
          {conversation.type === 'group' && (
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onEditConversation?.(conversation)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Modifier le groupe
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => onAddParticipants?.(conversation)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter des membres
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteConversation?.(conversation)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer le groupe
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Media Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">📷 Media</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">60</span>
            <span className="text-sm text-green-500">Voir tout</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square bg-gray-100 rounded-md"></div>
          <div className="aspect-square bg-gray-100 rounded-md"></div>
          <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center">
            <span className="text-xs text-gray-500">50+</span>
          </div>
        </div>
      </div>

      {/* Files Section */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">📁 Files</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">20</span>
            <span className="text-sm text-green-500">Voir tout</span>
          </div>
        </div>
        <div className="space-y-3">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md">
              <div
                className={`h-8 w-8 rounded-md flex items-center justify-center ${
                  file.type === "ai" ? "bg-red-100" : file.type === "png" ? "bg-blue-100" : "bg-green-100"
                }`}
              >
                <file.icon
                  className={`h-4 w-4 ${
                    file.type === "ai" ? "text-red-600" : file.type === "png" ? "text-blue-600" : "text-green-600"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{file.size}</p>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
