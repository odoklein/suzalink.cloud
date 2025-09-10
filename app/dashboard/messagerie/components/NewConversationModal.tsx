import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, User, Plus, Search, X } from 'lucide-react';
import { MessagerieAPI } from '../lib/messagerie-api';
import { toast } from 'sonner';
import type { UserProfile } from '@/app/types/user';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation?: any) => void;
}

interface UserWithSelection extends UserProfile {
  selected: boolean;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated
}: NewConversationModalProps) {
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('group');
  const [title, setTitle] = useState('');
  const [users, setUsers] = useState<UserWithSelection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    } else {
      // Reset state when closing
      setTitle('');
      setUsers([]);
      setSearchQuery('');
      setConversationType('group');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await MessagerieAPI.getUsers();
      setUsers(response.users.map(user => ({ ...user, selected: false })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  const selectedUsers = users.filter(user => user.selected);

  const handleUserToggle = (userId: string) => {
    setUsers(prev =>
      prev.map(user => {
        if (user.id === userId) {
          return { ...user, selected: !user.selected };
        }
        // For direct messages, deselect other users when selecting a new one
        if (conversationType === 'direct' && user.selected) {
          return { ...user, selected: false };
        }
        return user;
      })
    );
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Veuillez sélectionner au moins un participant');
      return;
    }

    if (conversationType === 'direct' && selectedUsers.length !== 1) {
      toast.error('Un message direct ne peut avoir qu\'un seul participant');
      return;
    }

    if (conversationType === 'group' && !title.trim()) {
      toast.error('Veuillez saisir un titre pour la conversation de groupe');
      return;
    }

    try {
      setCreating(true);

      const conversationData = {
        title: conversationType === 'group' ? title.trim() : undefined,
        type: conversationType,
        participant_ids: selectedUsers.map(user => user.id)
      };

      const response = await MessagerieAPI.createConversation(conversationData);

      toast.success('Conversation créée avec succès!');
      onConversationCreated(response.conversation);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conversation Type */}
          <div>
            <Label className="text-base font-medium">Type de conversation</Label>
            <div className="mt-3 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="direct"
                  checked={conversationType === 'direct'}
                  onChange={(e) => setConversationType(e.target.value as 'direct' | 'group')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Message direct (1 personne)</span>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="group"
                  checked={conversationType === 'group'}
                  onChange={(e) => setConversationType(e.target.value as 'direct' | 'group')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Conversation de groupe</span>
                </div>
              </label>
            </div>
          </div>

          {/* Group Title */}
          {conversationType === 'group' && (
            <div>
              <Label htmlFor="title">Titre de la conversation</Label>
              <Input
                id="title"
                placeholder="Ex: Équipe Marketing, Projet Website..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <Label className="text-sm text-gray-600">
                Participants sélectionnés ({selectedUsers.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map(user => (
                  <Badge key={user.id} variant="default" className="flex items-center gap-1">
                    {user.full_name}
                    <button
                      onClick={() => handleUserToggle(user.id)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Users Search and Selection */}
          <div>
            <Label className="text-sm text-gray-600">
              {conversationType === 'direct' ? 'Sélectionner une personne' : 'Sélectionner les participants'}
            </Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher des utilisateurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="mt-3 max-h-48 overflow-y-auto border rounded-md">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserToggle(user.id)}
                    >
                      <input
                        type="checkbox"
                        checked={user.selected}
                        onChange={() => handleUserToggle(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && !loading && (
                    <div className="text-center py-4 text-gray-500">
                      Aucun utilisateur trouvé
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Annuler
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0 || creating}
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {conversationType === 'direct' ? 'Créer le message direct' : 'Créer la conversation'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
