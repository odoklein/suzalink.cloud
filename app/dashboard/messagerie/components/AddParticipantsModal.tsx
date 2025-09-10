import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation, ConversationParticipant } from '@/app/types/messagerie';
import type { UserProfile } from '@/app/types/user';
import { MessagerieAPI } from '../lib/messagerie-api';

interface AddParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onParticipantsAdded: () => void;
}

export function AddParticipantsModal({
  isOpen,
  onClose,
  conversation,
  onParticipantsAdded
}: AddParticipantsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (isOpen && conversation) {
      loadAvailableUsers();
    }
  }, [isOpen, conversation]);

  const loadAvailableUsers = async () => {
    if (!conversation) return;

    try {
      setFetchingUsers(true);

      // Load all users
      const usersResponse = await MessagerieAPI.getUsers();

      // Load current participants
      const participantsResponse = await MessagerieAPI.getParticipants(conversation.id);

      // Filter out users who are already participants
      const participantUserIds = participantsResponse.participants.map((p: any) => p.user_id);
      const availableUsers = usersResponse.users.filter(user =>
        !participantUserIds.includes(user.id)
      );

      setAvailableUsers(availableUsers);
    } catch (error) {
      console.error('Error loading available users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setFetchingUsers(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || selectedUserIds.length === 0) return;

    try {
      setLoading(true);
      await MessagerieAPI.addParticipants(conversation.id, selectedUserIds);
      onParticipantsAdded();
      toast.success(`${selectedUserIds.length} participant(s) ajouté(s) avec succès`);
      handleClose();
    } catch (error) {
      console.error('Error adding participants:', error);
      toast.error('Erreur lors de l\'ajout des participants');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedUserIds([]);
    setAvailableUsers([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter des participants</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Rechercher des utilisateurs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            <Label>Utilisateurs disponibles</Label>
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {fetchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  {searchQuery ? 'Aucun utilisateur trouvé' : 'Tous les utilisateurs sont déjà participants'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                      <Checkbox
                        id={user.id}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                        disabled={loading}
                      />
                      <label htmlFor={user.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Count */}
          {selectedUserIds.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedUserIds.length} utilisateur(s) sélectionné(s)
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedUserIds.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter ({selectedUserIds.length})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
